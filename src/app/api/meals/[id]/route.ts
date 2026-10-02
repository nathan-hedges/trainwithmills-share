import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cleanMeal } from "@/lib/nutrition/server";

// PATCH /api/meals/[id] -coach edits a meal.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;
  const data = cleanMeal(await req.json());
  if (!data.name) return new Response("Name is required", { status: 400 });
  const meal = await prisma.meal.update({ where: { id }, data });
  return Response.json(meal);
}

// DELETE /api/meals/[id] -coach removes a meal.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;
  await prisma.meal.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
