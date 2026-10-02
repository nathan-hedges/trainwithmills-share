import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { initialsOf } from "@/lib/portal/types";
import { addDays, today as cycleToday } from "@/lib/cycle";

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// GET /api/clients/needs-attention - clients the coach should look at, with the
// reason(s): no recent activity, unreviewed form videos, or low weekly adherence.
export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") return new Response("Forbidden", { status: 403 });

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT", status: "active" },
    select: { id: true, firstName: true, lastName: true },
  });
  const ids = clients.map((c) => c.id);
  if (ids.length === 0) return Response.json([]);

  const workouts = await prisma.workout.findMany({
    where: { clientId: { in: ids } },
    select: {
      clientId: true,
      date: true,
      status: true,
      exercises: { select: { sets: { select: { completed: true } } } },
    },
  });
  const byClient = new Map<string, typeof workouts>();
  for (const w of workouts) {
    const arr = byClient.get(w.clientId) ?? [];
    arr.push(w);
    byClient.set(w.clientId, arr);
  }

  // Unreviewed client videos, counted per client.
  const vids = await prisma.message.groupBy({
    by: ["clientId"],
    where: { senderRole: "client", videoKey: { not: null }, verdict: null },
    _count: { clientId: true },
  });
  const videoCount = new Map(vids.map((v) => [v.clientId, v._count.clientId]));

  // ── Cycle context for training (tier 3) ──────────────────────────
  // Only for clients who chose to share EVERYTHING - symptoms are exactly what
  // "the basics" excludes. Private and minimal trackers never appear here.
  const sharingClients = await prisma.cycleProfile.findMany({
    where: { userId: { in: ids }, shareLevel: "full", consentAt: { not: null } },
    select: { userId: true },
  });
  const sharingIds = sharingClients.map((c) => c.userId);

  // Anything logged in the last 2 days that would change how a session should go.
  const NOTABLE = new Set(["Cramps", "Fatigue", "Low mood", "Poor sleep", "Headache", "Back ache", "Nausea"]);
  const recentCycleLogs = sharingIds.length
    ? await prisma.cycleLog.findMany({
        where: { userId: { in: sharingIds }, date: { gte: addDays(cycleToday(), -1) } },
        select: { userId: true, date: true, symptoms: true, mood: true, sleepQuality: true },
        orderBy: { date: "desc" },
      })
    : [];
  const cycleSignal = new Map<string, string>();
  for (const log of recentCycleLogs) {
    if (cycleSignal.has(log.userId)) continue; // newest wins
    const notable = log.symptoms.filter((sx) => NOTABLE.has(sx));
    const rough: string[] = [...notable];
    if (log.mood != null && log.mood <= 2) rough.push("low mood");
    if (log.sleepQuality != null && log.sleepQuality <= 2) rough.push("poor sleep");
    if (rough.length === 0) continue;
    cycleSignal.set(log.userId, rough.slice(0, 3).join(", ").toLowerCase());
  }

  const today = isoToday();
  const daysAgo = (iso: string) =>
    Math.round(
      (new Date(`${today}T00:00:00`).getTime() - new Date(`${iso}T00:00:00`).getTime()) / 86_400_000,
    );

  const flagged = clients
    .map((c) => {
      const ws = byClient.get(c.id) ?? [];
      const reasons: { type: string; label: string }[] = [];

      // 1) No activity in 5+ days (only if they had a session due today or earlier).
      const activity = ws.filter(
        (w) =>
          w.status === "completed" ||
          w.status === "in_progress" ||
          w.exercises.some((e) => e.sets.some((s) => s.completed)),
      );
      const lastActivityDays = activity.length ? Math.min(...activity.map((w) => daysAgo(w.date))) : null;
      const hadDueSession = ws.some((w) => daysAgo(w.date) >= 0);
      if (hadDueSession && (lastActivityDays === null || lastActivityDays > 5)) {
        reasons.push({
          type: "inactive",
          label: lastActivityDays != null ? `No logs in ${lastActivityDays} days` : "Hasn't started logging",
        });
      }

      // 2) Unreviewed form-check videos.
      const nVids = videoCount.get(c.id) ?? 0;
      if (nVids > 0) reasons.push({ type: "video", label: `${nVids} video${nVids === 1 ? "" : "s"} to review` });

      // 3) Low adherence over the trailing 7 days (only if sets were assigned).
      let total = 0;
      let done = 0;
      for (const w of ws) {
        const d = daysAgo(w.date);
        if (d >= 0 && d <= 6) for (const e of w.exercises) for (const s of e.sets) {
          total++;
          if (s.completed) done++;
        }
      }
      if (total > 0) {
        const pct = Math.round((done / total) * 100);
        if (pct < 55) reasons.push({ type: "adherence", label: `${pct}% adherence this week` });
      }

      // 4) Cycle symptoms worth adapting a session around - but only when she
      //    actually has training in the next couple of days.
      const signal = cycleSignal.get(c.id);
      const sessionSoon = ws.some((w) => {
        const d = daysAgo(w.date);
        return d <= 0 && d >= -2 && w.status !== "completed";
      });
      if (signal && sessionSoon) {
        reasons.push({ type: "cycle", label: `Logged ${signal} - may want an easier session` });
      }

      return { id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Client", initials: initialsOf(c), reasons };
    })
    .filter((c) => c.reasons.length > 0)
    .sort((a, b) => b.reasons.length - a.reasons.length);

  return Response.json(flagged);
}
