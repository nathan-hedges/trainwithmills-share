import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendNotificationEmail } from "@/lib/email";
import type { AnswerValue, FormQuestion } from "@/lib/forms/types";

const isEmpty = (v: AnswerValue) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0);

// POST /api/me/forms/[assignmentId]/submit - the client submits their answers.
export async function POST(req: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const { assignmentId } = await params;
  const { answers } = await req.json(); // FormAnswer[] (kept loose for the JSON column write)

  // Scope to the signed-in client so they can only submit their own assignment.
  const assignment = await prisma.formAssignment.findFirst({
    where: { id: assignmentId, client: { email } },
    include: {
      form: { select: { questions: true, title: true } },
      client: { select: { firstName: true, lastName: true, name: true } },
    },
  });
  if (!assignment) return new Response("Not found", { status: 404 });

  // Don't trust the client - re-check required answers against the form's questions.
  const questions = (Array.isArray(assignment.form.questions) ? assignment.form.questions : []) as unknown as FormQuestion[];
  const list = Array.isArray(answers) ? answers : [];
  const byId = new Map<string, AnswerValue>(list.map((a) => [a.questionId, a.value]));
  for (const q of questions) {
    if (q.required && isEmpty(byId.get(q.id) ?? null)) {
      return new Response(`Missing answer for: ${q.label}`, { status: 400 });
    }
  }

  await prisma.formAssignment.update({
    where: { id: assignmentId },
    data: { answers, status: "completed", completedAt: new Date() },
  });

  // Let the coach know. The hub notification ALWAYS fires; the email is gated by
  // the coach's notifyForms preference.
  const coach = await prisma.user.findFirst({
    where: { role: "COACH" },
    select: { id: true, email: true, notifyForms: true },
  });
  if (coach) {
    const clientName =
      [assignment.client.firstName, assignment.client.lastName].filter(Boolean).join(" ") ||
      assignment.client.name ||
      "A client";
    const title = `${clientName} completed "${assignment.form.title}"`;
    await createNotification(coach.id, "form", title, "/admin/forms");
    if (coach.notifyForms) {
      await sendNotificationEmail(coach.email, title, "/admin/forms");
    }
  }

  return new Response(null, { status: 204 });
}
