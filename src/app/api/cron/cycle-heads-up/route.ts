import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { predict, today, addDays, daysBetween } from "@/lib/cycle";

/**
 * GET /api/cron/cycle-heads-up (daily) - a quiet in-portal nudge two days
 * before a client's predicted period.
 *
 * Deliberately notification-only: no email. This is her own data, so nothing
 * here goes to the coach, and it runs for private trackers too.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const profiles = await prisma.cycleProfile.findMany({
      where: { consentAt: { not: null }, setupByCoachAt: { not: null } },
      select: {
        userId: true,
        contraception: true,
        avgCycleLength: true,
        avgPeriodLength: true,
      },
    });

    const since = addDays(today(), -365);
    let sent = 0;

    for (const profile of profiles) {
      const logs = await prisma.cycleLog.findMany({
        where: { userId: profile.userId, date: { gte: since } },
        select: { date: true, flow: true },
      });

      const p = predict(profile, logs);
      // Only for cycles we can honestly predict, and only at exactly 2 days out.
      if (!p.predicts || p.daysUntilNextPeriod !== 2 || !p.nextPeriodStart) continue;

      // Once per cycle: skip if we already nudged since her last period started.
      if (p.lastPeriodStart) {
        const sinceLastPeriod = new Date(`${p.lastPeriodStart}T00:00:00Z`);
        const already = await prisma.notification.findFirst({
          where: {
            userId: profile.userId,
            type: "reminder",
            title: { startsWith: "Your period is due" },
            createdAt: { gte: sinceLastPeriod },
          },
          select: { id: true },
        });
        if (already) continue;
      }

      // Guard against a stale prediction for someone who stopped logging.
      if (p.lastPeriodStart && daysBetween(p.lastPeriodStart, today()) > 60) continue;

      await createNotification(
        profile.userId,
        "reminder",
        "Your period is due in about 2 days - based on what you've logged",
        "/portal/cycle",
      );
      sent++;
    }

    return new Response(`Cycle heads-up sent to ${sent} of ${profiles.length} trackers`, { status: 200 });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}
