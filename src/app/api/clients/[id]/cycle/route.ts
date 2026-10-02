import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  contraceptionInfo,
  predict,
  energyByPhase,
  predictedOvulationDays,
  predictedPeriodDays,
  today,
  addDays,
} from "@/lib/cycle";
import { readJson, cycleProfileSchema } from "@/lib/validation";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

/**
 * GET /api/clients/[id]/cycle - the coach's view of one client.
 *
 * Sharing is the CLIENT's choice: "minimal" gives Millie the phase, the cycle
 * day and the energy pattern; "full" adds symptoms and her notes. Millie always
 * sees the setup itself (she configured it) and any safeguard flag.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  const { id } = await params;

  const profile = await prisma.cycleProfile.findUnique({ where: { userId: id } });
  if (!profile) return Response.json({ status: "not-set-up" });

  const info = contraceptionInfo(profile.contraception);
  const setup = {
    contraception: profile.contraception,
    contraceptionLabel: info.label,
    avgCycleLength: profile.avgCycleLength,
    avgPeriodLength: profile.avgPeriodLength,
    predicts: !info.blocksPrediction,
    shareLevel: profile.shareLevel,
  };

  if (!profile.setupByCoachAt) return Response.json({ status: "not-set-up", setup });
  if (!profile.consentAt) return Response.json({ status: "awaiting-consent", setup });
  // She has chosen to keep this entirely to herself. No logs, no prediction,
  // nothing derived - the promise on her screen has to be real.
  if (profile.shareLevel === "private") return Response.json({ status: "private" });

  const since = addDays(today(), -365);
  const logs = await prisma.cycleLog.findMany({
    where: { userId: id, date: { gte: since } },
    orderBy: { date: "desc" },
    select: { date: true, flow: true, symptoms: true, mood: true, sleepQuality: true, note: true },
  });

  const prediction = predict(profile, logs);

  const workouts = await prisma.workout.findMany({
    where: { clientId: id, date: { gte: since }, checkIn: { isNot: null } },
    select: { date: true, checkIn: { select: { energy: true } } },
  });
  const checkIns = workouts
    .filter((w) => w.checkIn?.energy != null)
    .map((w) => ({ date: w.date, energy: w.checkIn!.energy! }));

  const full = profile.shareLevel === "full";
  // Minimal sharing: dates and flow only - symptoms/mood/notes are stripped
  // HERE, server-side, so they never reach the browser at all.
  const shared = logs.map((l) => ({
    date: l.date,
    flow: l.flow,
    symptoms: full ? l.symptoms : [],
    mood: full ? l.mood : null,
    sleepQuality: full ? l.sleepQuality : null,
    note: full ? l.note : null,
  }));

  return Response.json({
    status: "active",
    setup,
    prediction,
    energyByPhase: energyByPhase(profile, logs, checkIns),
    logs: shared,
    predictedPeriod: predictedPeriodDays(prediction, profile.avgPeriodLength),
    predictedOvulation: predictedOvulationDays(prediction),
  });
}

/**
 * PATCH /api/clients/[id]/cycle - Millie sets a client up (contraception and
 * her usual lengths). Creating the profile does NOT start tracking: the client
 * still has to opt in before a single day is stored.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  const { id } = await params;

  const parsed = await readJson(req, cycleProfileSchema);
  if (parsed.error) return parsed.error;
  const { contraception, avgCycleLength, avgPeriodLength } = parsed.data;

  const client = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!client || client.role !== "CLIENT") return new Response("Client not found", { status: 404 });

  const profile = await prisma.cycleProfile.upsert({
    where: { userId: id },
    create: {
      userId: id,
      contraception,
      avgCycleLength,
      avgPeriodLength,
      setupByCoachAt: new Date(),
    },
    update: { contraception, avgCycleLength, avgPeriodLength, setupByCoachAt: new Date() },
  });

  return Response.json({ ok: true, awaitingConsent: profile.consentAt == null });
}

/** DELETE /api/clients/[id]/cycle - turn tracking off entirely and erase the logs. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  const { id } = await params;

  await prisma.$transaction([
    prisma.cycleLog.deleteMany({ where: { userId: id } }),
    prisma.cycleProfile.deleteMany({ where: { userId: id } }),
  ]);
  return new Response(null, { status: 204 });
}
