import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

const ALLOWED = ["note", "prescription", "order"];

// PATCH /api/workout-exercises/[id] -edit one placed exercise's note / order / prescription.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const data = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)));
  // workoutExercise (the exercise INSIDE a workout) -NOT exercise (the library).
  return Response.json(await prisma.workoutExercise.update({ where: { id }, data }));
}

// DELETE /api/workout-exercises/[id] -remove a placed exercise (its sets cascade away).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  await prisma.workoutExercise.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
