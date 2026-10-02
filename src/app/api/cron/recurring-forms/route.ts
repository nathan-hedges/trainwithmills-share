import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendNotificationEmail } from "@/lib/email";

// GET /api/cron/recurring-forms - re-assign standing recurring forms when due.
// Safe to run daily; the daysSince check gates the actual weekly/monthly cadence.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const daysSince = (d: string | null) =>
      d ? Math.floor((Date.now() - new Date(`${d}T00:00:00`).getTime()) / 86_400_000) : Infinity;

    const recurrences = await prisma.formRecurrence.findMany({
      where: { active: true },
      include: {
        form: { select: { id: true, title: true } },
        client: { select: { id: true, email: true, notifyForms: true } },
      },
    });

    let created = 0;
    for (const r of recurrences) {
      const due = r.cadence === "weekly" ? daysSince(r.lastRun) >= 7 : daysSince(r.lastRun) >= 28;
      if (!due) continue;

      await prisma.formAssignment.create({ data: { formId: r.formId, clientId: r.clientId } });
      await createNotification(r.clientId, "form", `New form to complete: ${r.form.title}`, "/portal/forms");
      if (r.client.notifyForms) {
        await sendNotificationEmail(r.client.email, `New form: ${r.form.title}`, "/portal/forms");
      }
      await prisma.formRecurrence.update({ where: { id: r.id }, data: { lastRun: today } });
      created++;
    }

    return new Response(`Assigned ${created} recurring forms`, { status: 200 });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}
