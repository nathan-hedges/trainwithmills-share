import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeAdherence, todayStatus } from "@/lib/analytics";

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") return new Response("Forbidden", { status: 403 });

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, firstName: true, lastName: true, email: true, avatarKey: true,
      plan: true, goal: true, program: true, status: true,
      billingExempt: true, subscriptionStatus: true,
      programmePaidAt: true, group: { select: { name: true, startDate: true } },
    },
  });

  // Pull every client's workouts in one query, then compute adherence + today's
  // status per client in memory (keeps the roster to two queries total).
  const ids = clients.map((c) => c.id);
  const workouts = ids.length
    ? await prisma.workout.findMany({
        where: { clientId: { in: ids } },
        select: {
          clientId: true,
          date: true,
          status: true,
          exercises: { select: { sets: { select: { completed: true } } } },
        },
      })
    : [];

  const byClient = new Map<string, typeof workouts>();
  for (const w of workouts) {
    const arr = byClient.get(w.clientId) ?? [];
    arr.push(w);
    byClient.set(w.clientId, arr);
  }

  const today = isoToday();

  // Current week (Mon..Sun) ISO dates, for "days this week" on the roster.
  const base = new Date();
  const mondayOffset = (base.getDay() + 6) % 7;
  const weekSet = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - mondayOffset + i);
    weekSet.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }

  const withMetrics = clients.map((c) => {
    const ws = byClient.get(c.id) ?? [];
    return {
      ...c,
      adherence: computeAdherence(ws),
      today: todayStatus(ws, today),
      weekDays: [...new Set(ws.filter((w) => weekSet.has(w.date)).map((w) => w.date))],
    };
  });

  return Response.json(withMetrics);
}
