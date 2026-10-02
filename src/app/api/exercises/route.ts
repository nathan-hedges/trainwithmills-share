import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readJson, exerciseCreateSchema } from "@/lib/validation";

export async function GET() {
  const session = await auth();
  if ((session?.user as {role?: string})?.role !== "COACH") return new Response("Forbidden", { status: 403 });
  return Response.json(await prisma.exercise.findMany({ orderBy: { name: "asc" } }));
}

export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as {role?: string})?.role !== "COACH") return new Response("Forbidden", { status: 403 });
  const parsed = await readJson(req, exerciseCreateSchema);
  if (parsed.error) return parsed.error;
  const { name, category, cue, guideImageUrl } = parsed.data;
  return Response.json(await prisma.exercise.create({ data: { name, category, cue: cue ?? null, guideImageUrl: guideImageUrl ?? null } }));
}