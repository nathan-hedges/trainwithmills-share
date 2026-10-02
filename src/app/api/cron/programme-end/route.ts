import { prisma } from "@/lib/prisma";
import { programmeEnded, programmeLastDay, PROGRAMME_DAYS } from "@/lib/billing";
import { brandedEmail, sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

/**
 * GET /api/cron/programme-end (daily) - Strong Girl Project wrap-up.
 * When a group's 6 weeks (day 42) are over, each member gets a goodbye email
 * nudging them towards Your Strong Era, exactly once. Access itself needs no
 * action here: hasPortalAccess() already fails once the window has passed.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Candidates: paid, in a group that started at least 6 weeks ago, not yet
    // emailed. programmeEnded() re-checks the exact day-42 boundary.
    const windowStart = new Date();
    windowStart.setUTCDate(windowStart.getUTCDate() - (PROGRAMME_DAYS - 1));
    const candidates = await prisma.user.findMany({
      where: {
        role: "CLIENT",
        programmePaidAt: { not: null },
        programmeEndEmailSent: false,
        group: { startDate: { lte: windowStart } },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        group: { select: { name: true, startDate: true } },
      },
    });

    const APP_URL = process.env.APP_URL ?? "https://trainwithmills.co.uk";
    const coach = await prisma.user.findFirst({ where: { role: "COACH" }, select: { id: true } });
    let sent = 0;

    for (const c of candidates) {
      if (!c.group || !programmeEnded(c.group.startDate)) continue;

      const lastDay = programmeLastDay(c.group.startDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      });

      await sendEmail({
        to: c.email,
        subject: "Your Strong Girl Project has finished - what's next?",
        html: brandedEmail({
          heading: "You did it - six weeks strong",
          intro: `Hi ${c.firstName || "there"}, your Strong Girl Project finished on ${lastDay}. Be proud of every session, every rep and every win along the way. Your programme access has now ended - if you'd like a copy of anything from your six weeks (your lesson notes, your programme or your progress numbers), just reply and I'll send them over. And this doesn't have to be where it stops: if you'd like to keep going with fully personal 1-1 coaching, Your Strong Era picks up exactly where the Project leaves off - your own programme, direct access to me, and coaching built around your life. Reply to this email and I'll set you up, or you're always welcome back for another round of the Project.`,
          button: { label: "See Your Strong Era", url: `${APP_URL}/services` },
          footerNote: "Questions, or want my honest advice on what's right for you next? Just reply to this email.",
        }),
      }).catch(() => {});

      await prisma.user.update({
        where: { id: c.id },
        data: { programmeEndEmailSent: true, status: "paused" },
      });

      if (coach) {
        await createNotification(
          coach.id,
          "summary",
          `${c.firstName || "A client"}'s Strong Girl programme (${c.group.name}) has ended`,
          `/admin/clients/${c.id}`,
        );
      }
      sent++;
    }

    return new Response(`Programme-end processed: ${sent} of ${candidates.length} candidates`, { status: 200 });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}
