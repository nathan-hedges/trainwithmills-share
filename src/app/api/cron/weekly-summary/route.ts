import { createNotification } from "@/lib/notifications";
import { clientWeeklySummary, coachWeeklySummary } from "@/lib/analytics";
import { brandedEmail, escapeHtml, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const cutoffObj = new Date();
    cutoffObj.setDate(cutoffObj.getDate() - 90);
    const cutoff = cutoffObj.toISOString().split("T")[0];

    const workoutSelect = {
        id: true,
        date: true,
        title: true,
        focus: true,
        status: true,
        checkIn: { select: { energy: true, cyclePhase: true, note: true } },
        exercises: {
            select: {
            exercise: { select: { id: true, name: true, category: true } },
            sets: {
                select: {
                targetReps: true, targetRpe: true,
                loggedReps: true, loggedWeight: true, completed: true,
                },
            },
            },
        },
    } as const;

    const clients = await prisma.user.findMany({
    where: { role: "CLIENT", status: "active" },
    select: {
        id: true,
        email: true,
        firstName: true,
        notifySummary: true,
        workouts: {
        where: { date: { gte: cutoff } }, // bounded window: enough history for PR detection
        select: workoutSelect,
        orderBy: { date: "asc" },
        },
    },
    });

    const APP_URL = process.env.APP_URL ?? "https://trainwithmills.co.uk";

    // Each client: always create the in-portal notification; only email the
    // recap to clients who turned summary emails on.
    for (const c of clients) {
      const s = clientWeeklySummary(c.workouts);

      await createNotification(c.id, "summary", "Your weekly summary is ready", "/portal/progress");

      if (c.notifySummary) {
        const bodyHtml = `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;color:#1a1f36;">
            <tr><td style="padding:6px 0;">Sessions done</td><td align="right"><b>${s.sessionsCompleted}/${s.sessionsPlanned}</b></td></tr>
            <tr><td style="padding:6px 0;">Adherence</td><td align="right"><b>${s.adherence}%</b></td></tr>
            <tr><td style="padding:6px 0;">Volume lifted</td><td align="right"><b>${s.volume}t</b></td></tr>
            <tr><td style="padding:6px 0;">Personal records</td><td align="right"><b>${s.prs}</b></td></tr>
          </table>`;
        const html = brandedEmail({
          heading: `Your week, ${c.firstName ?? "there"}`,
          intro: `Here's your ${s.weekLabel} recap.`,
          bodyHtml,
          button: { label: "View your progress", url: `${APP_URL}/portal/progress` },
        });
        await sendEmail({ to: c.email, subject: `Your weekly summary (${s.weekLabel})`, html });
      }
    }

    // The coach: same pattern -hub notification always, email if opted in.
    const coach = await prisma.user.findFirst({
      where: { role: "COACH" },
      select: { id: true, email: true, firstName: true, notifySummary: true },
    });

    if (coach) {
      const cs = coachWeeklySummary(
        clients.map((c) => ({ clientId: c.id, name: c.firstName ?? "Client", workouts: c.workouts })),
      );

      await createNotification(coach.id, "summary", "This week's client summary is ready", "/admin");

      if (coach.notifySummary) {
        const rows = cs.rows
          .map(
            (r) =>
              `<tr><td style="padding:4px 0;">${escapeHtml(r.name)}</td><td align="right">${r.sessionsCompleted}/${r.sessionsPlanned} · ${r.adherence}%</td></tr>`,
          )
          .join("");
        const html = brandedEmail({
          heading: "Your weekly client summary",
          intro: `${cs.totalClients} clients · ${cs.avgAdherence}% average adherence this week.`,
          bodyHtml: `<table role="presentation" width="100%" style="font-size:14px;color:#1a1f36;">${rows}</table>`,
          button: { label: "Open dashboard", url: `${APP_URL}/admin` },
        });
        await sendEmail({ to: coach.email, subject: `Weekly client summary (${cs.weekLabel})`, html });
      }
    }

    return new Response(`Weekly summaries sent for ${clients.length} clients`, { status: 200 });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}