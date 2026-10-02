import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readJson, reorderSchema } from "@/lib/validation";

// POST /api/workouts/[id]/exercises/reorder
// Body: { ids: string[] } - WorkoutExercise ids in their new display order.
// Each exercise's `order` is set to its index. Scoped to this workout so a coach
// can't reorder exercises that don't belong to it.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id: workoutId } = await params;
  const parsed = await readJson(req, reorderSchema);
  if (parsed.error) return parsed.error;
  const { ids } = parsed.data;

  await prisma.$transaction(
    ids.map((exId: string, i: number) =>
      prisma.workoutExercise.updateMany({
        where: { id: exId, workoutId },
        data: { order: i },
      }),
    ),
  );

  return new Response("Reordered", { status: 200 });
}
