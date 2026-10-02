import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  contraceptionInfo,
  cycleLengths,
  energyByPhase,
  predict,
  predictedOvulationDays,
  predictedPeriodDays,
  symptomPatterns,
  today,
  addDays,
} from "@/lib/cycle";
import { readJson, cycleConsentSchema } from "@/lib/validation";

/**
 * GET /api/me/cycle - everything the client's cycle page needs.
 *
 * Three states, in order:
 *   not-set-up   Millie hasn't configured them yet - we show nothing else.
 *   needs-consent Configured, but she hasn't opted in. NOTHING is stored until she does.
 *   active        Tracking properly.
 */
export async function GET() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true, cycleProfile: true },
  });
  if (!me) return new Response("Unauthorized", { status: 401 });

  const profile = me.cycleProfile;
  if (!profile?.setupByCoachAt) return Response.json({ status: "not-set-up" });

  const info = contraceptionInfo(profile.contraception);
  const profileDTO = {
    contraception: profile.contraception,
    contraceptionLabel: info.label,
    avgCycleLength: profile.avgCycleLength,
    avgPeriodLength: profile.avgPeriodLength,
    shareLevel: profile.shareLevel,
    predicts: !info.blocksPrediction,
    predictionNote: info.note ?? null,
  };

  if (!profile.consentAt) return Response.json({ status: "needs-consent", profile: profileDTO });

  // A year of logs is plenty for averages and the history list.
  const since = addDays(today(), -365);
  const logs = await prisma.cycleLog.findMany({
    where: { userId: me.id, date: { gte: since } },
    orderBy: { date: "desc" },
    select: {
      date: true,
      flow: true,
      symptoms: true,
      mood: true,
      sleepQuality: true,
      note: true,
    },
  });

  const prediction = predict(profile, logs);

  // Her own energy pattern, from post-workout check-ins she's already doing.
  const workouts = await prisma.workout.findMany({
    where: { clientId: me.id, date: { gte: since }, checkIn: { isNot: null } },
    select: { date: true, checkIn: { select: { energy: true } } },
  });
  const checkIns = workouts
    .filter((w) => w.checkIn?.energy != null)
    .map((w) => ({ date: w.date, energy: w.checkIn!.energy! }));

  // Only phases Millie has actually written about.
  const stored = await prisma.cycleGuidance.findMany();
  const guidance = stored
    .filter((g) => g.training.trim())
    .map((g) => ({ phase: g.phase, training: g.training }));

  return Response.json({
    status: "active",
    profile: profileDTO,
    prediction,
    todayLog: logs.find((l) => l.date === today()) ?? null,
    // The calendar needs the whole window, not a recent slice.
    logs,
    guidance,
    energyByPhase: energyByPhase(profile, logs, checkIns),
    symptomPatterns: symptomPatterns(profile, logs),
    cycleLengths: cycleLengths(logs),
    predictedPeriod: predictedPeriodDays(prediction, profile.avgPeriodLength),
    predictedOvulation: predictedOvulationDays(prediction),
  });
}

/**
 * POST /api/me/cycle - the client opts in. Health data, so nothing is stored
 * before this and she can withdraw at any time (settings DELETE).
 *
 * Optionally takes `lastPeriodStart`, which we store as a single bleed day so
 * she gets a real cycle day and prediction immediately instead of waiting a
 * month for the first logged period.
 */
export async function POST(req: Request) {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true, cycleProfile: { select: { setupByCoachAt: true } } },
  });
  if (!me) return new Response("Unauthorized", { status: 401 });
  if (!me.cycleProfile?.setupByCoachAt) {
    return new Response("I haven't set your cycle tracking up yet.", { status: 400 });
  }

  // Body is optional - an empty consent POST is still valid.
  let lastPeriodStart: string | null = null;
  const raw = await req.text();
  if (raw.trim()) {
    const parsed = await readJson(new Request(req.url, { method: "POST", body: raw }), cycleConsentSchema);
    if (parsed.error) return parsed.error;
    lastPeriodStart = parsed.data.lastPeriodStart ?? null;
  }

  await prisma.cycleProfile.update({
    where: { userId: me.id },
    data: { consentAt: new Date() },
  });

  if (lastPeriodStart && lastPeriodStart <= today()) {
    await prisma.cycleLog.upsert({
      where: { userId_date: { userId: me.id, date: lastPeriodStart } },
      create: { userId: me.id, date: lastPeriodStart, flow: "medium" },
      update: { flow: "medium" },
    });
  }

  return Response.json({ ok: true });
}
