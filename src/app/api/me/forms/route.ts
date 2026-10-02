import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/me/forms - the signed-in client's assigned forms (unfinished first).
export async function GET() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const assignments = await prisma.formAssignment.findMany({
    where: { client: { email } },
    orderBy: [{ status: "asc" }, { assignedAt: "desc" }], // "assigned" sorts before "completed"
    include: { form: true },
  });

  return Response.json(
    assignments.map((a) => ({
      assignmentId: a.id,
      status: a.status,
      dueDate: a.dueDate,
      form: {
        id: a.form.id,
        title: a.form.title,
        description: a.form.description,
        questions: a.form.questions, // already a FormQuestion[]
      },
      answers: a.answers ?? null,
    })),
  );
}
