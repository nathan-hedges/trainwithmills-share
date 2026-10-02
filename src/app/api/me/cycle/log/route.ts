import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { predict, today, daysBetween } from "@/lib/cycle";
import { readJson, cycleLogSchema } from "@/lib/validation";

async function consentedUser() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return null;
  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true, firstName: true, cycleProfile: true },
  });
  if (!me?.cycleProfile?.setupByCoachAt || !me.cycleProfile.consentAt) return null;
  return me;
}

/**
 * PUT /api/me/cycle/log - save (or clear) one day. Sending a day with no flow,
 * no symptoms, no mood/sleep and no note deletes the row rather than storing an
 * empty one, so "undo" is just untapping everything.
 */
export async function PUT(req: Request) {
  const me = await consentedUser();
  if (!me) return new Response("Cycle tracking isn't set up for you", { status: 403 });

  const parsed = await readJson(req, cycleLogSchema);
  if (parsed.error) return parsed.error;
  const { date, flow, symptoms, mood, sleepQuality, note } = parsed.data;

  // No future logging, and no rewriting ancient history.
  if (date > today()) return new Response("You can't log a day that hasn't happened yet", { status: 400 });
  if (daysBetween(date, today()) > 365) return new Response("That day is too far back", { status: 400 });

  const cleanSymptoms = symptoms ?? [];
  const isEmpty =
    !flow && cleanSymptoms.length === 0 && mood == null && sleepQuality == null && !note;

  if (isEmpty) {
    await prisma.cycleLog.deleteMany({ where: { userId: me.id, date } });
  } else {
    await prisma.cycleLog.upsert({
      where: { userId_date: { userId: me.id, date } },
      create: {
        userId: me.id,
        date,
        flow: flow ?? null,
        symptoms: cleanSymptoms,
        mood: mood ?? null,
        sleepQuality: sleepQuality ?? null,
        note: note ?? null,
      },
      update: {
        flow: flow ?? null,
        symptoms: cleanSymptoms,
        mood: mood ?? null,
        sleepQuality: sleepQuality ?? null,
        note: note ?? null,
      },
    });
  }

  const logs = await prisma.cycleLog.findMany({
    where: { userId: me.id },
    orderBy: { date: "desc" },
    take: 400,
    select: { date: true, flow: true },
  });
  const prediction = predict(me.cycleProfile!, logs);

  // Safeguards are shown to HER, on her own cycle page (see the "Worth a
  // mention" card). Deliberately no coach notification: this is health
  // information about her body, and she decides whether to raise it with Millie.

  return Response.json({ ok: true, prediction });
}
