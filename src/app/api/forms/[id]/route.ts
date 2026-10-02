import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cleanQuestions, toDetail}  from "@/lib/forms/server";

const isCoach = (s: { user?: unknown } | null) =>
  (s?.user as { role?: string })?.role === "COACH";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isCoach(session)) return new Response("Forbidden", { status: 403 });
  
  const { id } = await params;
  const form = await prisma.form.findUnique({
    where: { id }
  });

  if (!form) return new Response("Not found", { status: 404 });

  return Response.json(toDetail(form));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isCoach(session)) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const title = String(body.title ?? "").trim();
  if (!title) return new Response("Title is required", { status: 400 });

  const updated = await prisma.form.update({
    where: { id },
      data: {
        title,
        description: String(body.description ?? "").trim() || null,
        questions: cleanQuestions(body.questions),
      },
    });
  
    return Response.json(toDetail(updated));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {

  const session = await auth();
  if (!isCoach(session)) return new Response("Forbidden", { status: 403 });
  const {id } = await params;

  await prisma.form.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
