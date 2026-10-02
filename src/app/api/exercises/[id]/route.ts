import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

const ALLOWED = ["name", "category", "cue", "guideImageUrl"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const data = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)));
  return Response.json(await prisma.exercise.update({ where: { id }, data }));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  await prisma.exercise.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
