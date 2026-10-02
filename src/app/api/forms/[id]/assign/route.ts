import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendNotificationEmail } from "@/lib/email";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;

  const form = await prisma.form.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!form) return new Response("Not found", { status: 404 });

  const body = await req.json();
  const dueDate: string | null = body.dueDate || null;

  // Resolve targets: a whole group, explicit ids, or every active client.
  const clients = await prisma.user.findMany({
    where: body.groupId
      ? { role: "CLIENT", groupId: String(body.groupId) }
      : body.clientIds === "all"
        ? { role: "CLIENT", status: "active" }
        : { id: { in: Array.isArray(body.clientIds) ? body.clientIds : [] } },
    select: { id: true, email: true, notifyForms: true },
  });

  for (const c of clients) {
    await prisma.formAssignment.create({ data: { formId: form.id, clientId: c.id, dueDate } });

    // Always show it in the portal bell...
    await createNotification(c.id, "form", `New form to complete: ${form.title}`, "/portal/forms");
    // ...email only if they opted in.
    if (c.notifyForms) {
      await sendNotificationEmail(c.email, `New form: ${form.title}`, "/portal/forms");
    }

    // Standing recurrence rule, if requested.
    if (body.recurrence?.cadence) {
      await prisma.formRecurrence.create({
        data: { formId: form.id, clientId: c.id, cadence: body.recurrence.cadence },
      });
    }
  }

  return Response.json({ assigned: clients.length });
}