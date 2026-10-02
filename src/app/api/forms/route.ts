import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cleanQuestions, toDetail}  from "@/lib/forms/server";

const isCoach = (s: { user?: unknown } | null) =>
  (s?.user as { role?: string })?.role === "COACH";

export async function GET() {
  const session = await auth();
  if (!isCoach(session)) return new Response("Forbidden", { status: 403 });

  const forms = await prisma.form.findMany({
    orderBy: { createdAt: "desc" },
    include: { assignments: { select: { status: true } } },
  });

  return Response.json(
    forms.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      questionCount: Array.isArray(f.questions) ? (f.questions as unknown[]).length : 0,
      assignedCount: f.assignments.length,
      completedCount: f.assignments.filter((a) => a.status === "completed").length,
      createdAt: f.createdAt,
    })),
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!isCoach(session)) return new Response("Forbidden", { status: 403 });

  const body = await req.json();
  const title = String(body.title ?? "").trim();
  if (!title) return new Response("Title is required", { status: 400 });

  const form = await prisma.form.create({
    data: {
      title,
      description: String(body.description ?? "").trim() || null,
      questions: cleanQuestions(body.questions),
    },
  });

  return Response.json(toDetail(form));
}