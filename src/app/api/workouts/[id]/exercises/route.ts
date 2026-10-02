import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCardioCategory } from "@/lib/duration";
import { readJson, addExerciseSchema } from "@/lib/validation";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

// POST /api/workouts/[id]/exercises -add a library exercise (with 3 starter sets)
// to a workout. The [id] in the path is the WORKOUT's id.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

  const { id: workoutId } = await params; // the workout we're adding to
  const parsed = await readJson(req, addExerciseSchema);
  if (parsed.error) return parsed.error;
  const { exerciseId } = parsed.data;

  // Cardio exercises get interval starter sets; strength gets 3 × 10.
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId }, select: { category: true } });
  if (!exercise) return new Response("Exercise not found", { status: 404 });
  const cardio = isCardioCategory(exercise.category);

  // New exercise goes at the end: its order = how many are already in the workout.
  const order = await prisma.workoutExercise.count({ where: { workoutId } });

  const created = await prisma.workoutExercise.create({
    data: {
      workoutId,
      exerciseId,
      order,
      prescription: cardio ? "3 × 0:30 on / 0:30 off" : "3 × 10",
      // Nested write: create the row AND its 3 starter sets in one go.
      sets: {
        create: [1, 2, 3].map((n) =>
          cardio
            ? { order: n, targetReps: 0, workSeconds: 30, restSeconds: 30 }
            : { order: n, targetReps: 10 },
        ),
      },
    },
    include: { sets: true, exercise: true },
  });

  return Response.json(created);
}
