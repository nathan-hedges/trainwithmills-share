import { createNotification } from "@/lib/notifications";
import { sendNotificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

// GET /api/cron/daily-reminders
// Run by a scheduler (e.g. a Vercel Cron) each morning. Protected by a shared
// secret so it can't be triggered by randoms.
//
// Every client with a session today gets the in-portal notification; only those
// who turned reminder emails on are also emailed.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    const workouts = await prisma.workout.findMany({
        where: {
            date: today,
            status: "assigned",
        },
        select: {
            id: true,
            clientId: true,
            title: true,
            client: { select: { email: true, notifyReminders: true } },
        }
    });

    let emailed = 0;
    for (const workout of workouts) {
        const title = `Today's session - ${workout.title} - is ready`;
        // Everyone with a session today gets the in-portal notification...
        await createNotification(workout.clientId, "reminder", title, `/portal`);
        // ...but it's only emailed to clients who opted in.
        if (workout.client.notifyReminders) {
            await sendNotificationEmail(workout.client.email, title, `/portal`);
            emailed++;
        }
    }
    return new Response(`Created ${workouts.length} reminders, emailed ${emailed}`, { status: 200});
  } catch {
    return new Response("Internal Server Error", { status: 500});
  }
}
