import { createNotification } from "@/lib/notifications";
import { brandedEmail, escapeHtml, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1 );
    const yesterday = yesterdayObj.toISOString().split("T")[0];

    const workouts = await prisma.workout.findMany({
      where: { date: yesterday, status: "assigned" },
      select: {
      id: true,
      clientId: true,
      client: { select: { firstName: true } },
        },
    });

    const coach = await prisma.user.findFirst({
      where: { role: "COACH" },
      select: { id: true, email: true, notifyReminders: true },
    });
    if (!coach) return new Response("No coach found", { status: 500 });

    // Always create the in-portal alert for the coach, one per client.
    for (const workout of workouts) {
      const name = workout.client.firstName ?? "A client";
      await createNotification(
        coach.id,
        "alert",
        `${name} missed a session`,
        `/admin/clients/${workout.clientId}`,
      );
    }

    // If the coach has reminder emails on, send ONE digest covering all of
    // yesterday's misses (rather than an email per client).
    if (workouts.length > 0 && coach.notifyReminders) {
      const APP_URL = process.env.APP_URL ?? "https://trainwithmills.co.uk";
      const rows = workouts
        .map((w) => {
          const name = escapeHtml(w.client.firstName ?? "A client");
          return `<tr><td style="padding:6px 0;"><a href="${APP_URL}/admin/clients/${w.clientId}" style="color:#2f43d8;text-decoration:none;font-weight:600;">${name}</a></td><td align="right" style="color:#586079;">missed a session</td></tr>`;
        })
        .join("");
      const html = brandedEmail({
        heading: `${workouts.length} ${workouts.length === 1 ? "client" : "clients"} missed a session`,
        intro: "These assigned sessions from yesterday weren't completed:",
        bodyHtml: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;color:#1a1f36;">${rows}</table>`,
        button: { label: "Open dashboard", url: `${APP_URL}/admin` },
      });
      await sendEmail({
        to: coach.email,
        subject: `${workouts.length} missed session${workouts.length === 1 ? "" : "s"} yesterday`,
        html,
      });
    }

    return new Response(`Flagged ${workouts.length} missed sessions`, { status: 200 });
  } catch {
    return new Response("Internal Server Error", { status: 500});
  }
}
