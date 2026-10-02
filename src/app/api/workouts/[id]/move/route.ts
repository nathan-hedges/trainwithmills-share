import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readJson, moveWorkoutSchema } from "@/lib/validation";

// POST /api/workouts/[id]/move — move a session to another date. If the client
// already has a session on the target date, the two SWAP. Body: { date }.
// (clientId, date) is unique, so the swap goes through a temporary date inside
// one transaction - it can never be observed half-done.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const parsed = await readJson(req, moveWorkoutSchema);
  if (parsed.error) return parsed.error;
  const targetDate = parsed.data.date;

  const workout = await prisma.workout.findUnique({ where: { id }, select: { clientId: true, date: true } });
  if (!workout) return new Response("Workout not found", { status: 404 });
  if (workout.date === targetDate) return Response.json({ moved: false });

  const other = await prisma.workout.findFirst({
    where: { clientId: workout.clientId, date: targetDate },
    select: { id: true },
  });

  if (other) {
    await prisma.$transaction([
      prisma.workout.update({ where: { id }, data: { date: `tmp-${id}` } }), // step aside
      prisma.workout.update({ where: { id: other.id }, data: { date: workout.date } }),
      prisma.workout.update({ where: { id }, data: { date: targetDate } }),
    ]);
  } else {
    await prisma.workout.update({ where: { id }, data: { date: targetDate } });
  }

  return Response.json({ moved: true, swapped: !!other });
}
