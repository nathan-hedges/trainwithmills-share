import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cleanSets, setPrescription } from "@/lib/sets";
import { readJson, setsBodySchema } from "@/lib/validation";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

// PUT /api/workout-exercises/[id]/sets -replace the set plan with an explicit
// per-set list. Body: { sets: [{ targetReps, targetRpe }, ...] } for strength,
// or [{ workSeconds, restSeconds, pace }, ...] for cardio intervals.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const parsed = await readJson(req, setsBodySchema);
  if (parsed.error) return parsed.error;

  // Clean + order each set (each keeps its OWN reps/RPE or interval - pyramids allowed).
  const clean = cleanSets(parsed.data.sets).map((s, i) => ({ ...s, order: i + 1 }));
  const prescription = setPrescription(clean);

  await prisma.$transaction([
    prisma.workoutSet.deleteMany({ where: { workoutExerciseId: id } }),
    prisma.workoutExercise.update({
      where: { id },
      data: { prescription, sets: { create: clean } },
    }),
  ]);

  const updated = await prisma.workoutExercise.findUnique({
    where: { id },
    include: { sets: { orderBy: { order: "asc" } }, exercise: true },
  });
  return Response.json(updated);
}
