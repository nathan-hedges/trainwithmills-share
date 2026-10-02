import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

// Only these fields may be changed through this route (a "whitelist" - never
// trust the body to only contain safe keys).
const ALLOWED = ["title", "focus", "status", "date", "warmup"];

// PATCH /api/workouts/[id] -edit a session's title/focus/status/date.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

  const { id } = await params; // the [id] from the URL (params is a Promise in Next 16)
  const body = await req.json();
  // Keep only allowed keys from whatever the client sent.
  const data = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)));

  const workout = await prisma.workout.update({ where: { id }, data });
  return Response.json(workout);
}

// DELETE /api/workouts/[id] -remove a session.
// Its exercises, sets and check-in delete automatically (onDelete: Cascade).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  await prisma.workout.delete({ where: { id } });
  return new Response(null, { status: 204 }); // 204 = success, no body
}
