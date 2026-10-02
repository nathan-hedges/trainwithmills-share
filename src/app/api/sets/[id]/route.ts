import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { maybeAutoComplete } from "@/lib/workoutCompletion";

// PATCH /api/sets/[id] -the client logs their actual reps/weight for one set.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return new Response("User not found", { status: 404 });

  const { id: setId } = await params;
  const { loggedReps, loggedWeight, loggedDistance, loggedPace, completed } = await req.json();

  // Ownership: this set is mine only if set → workoutExercise → workout.clientId === me.
  const owned = await prisma.workoutSet.findFirst({
    where: { id: setId, workoutExercise: { workout: { clientId: me.id } } },
    include: { workoutExercise: true },
  });
  if (!owned) return new Response("Set not found", { status: 403 });

  const updatedSet = await prisma.workoutSet.update({
    where: { id: setId },
    data: {
      // undefined = "don't change this field"
      loggedReps: loggedReps !== undefined ? (loggedReps === null ? null : Number(loggedReps)) : undefined,
      loggedWeight: loggedWeight !== undefined ? (loggedWeight === null ? null : Number(loggedWeight)) : undefined,
      // cardio actuals
      loggedDistance:
        loggedDistance !== undefined ? (loggedDistance === null ? null : Number(loggedDistance)) : undefined,
      loggedPace:
        loggedPace !== undefined ? (typeof loggedPace === "string" && loggedPace.trim() ? loggedPace.trim() : null) : undefined,
      completed: completed !== undefined ? Boolean(completed) : undefined,
    },
  });

  // Nudge the WORKOUT from "assigned" to "in_progress" once they start logging.
  // updateMany + status:"assigned" means we never override an already-"completed" workout.
  await prisma.workout.updateMany({
    where: { id: owned.workoutExercise.workoutId, status: "assigned" },
    data: { status: "in_progress" },
  });

  // Auto-complete: if this set was the last thing outstanding (counting opted-out
  // exercises as done), the whole session flips to completed. PB detection now
  // happens ONCE at that completion (see lib/workoutCompletion.ts), not per set.
  const completion = await maybeAutoComplete(owned.workoutExercise.workoutId);

  return Response.json({ ...updatedSet, workoutCompleted: completion.completed, prs: completion.prs });
}
