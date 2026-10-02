import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifySessionPRs } from "@/lib/workoutCompletion";

// POST /api/workouts/[id]/complete -the client marks their session done.
// NOTE: must be `export`ed, or Next never registers the handler (405).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return new Response("User not found", { status: 404 });

  const { id: workoutId } = await params; // here [id] is the WORKOUT's id

  // Ownership: the workout must belong to me.
  const owned = await prisma.workout.findFirst({ where: { id: workoutId, clientId: me.id } });
  if (!owned) return new Response("Workout not found", { status: 403 });

  const alreadyCompleted = owned.status === "completed";
  const updated = await prisma.workout.update({
    where: { id: workoutId },
    data: { status: "completed" },
  });

  // PB check fires once, on the transition into completed (repeat taps are no-ops).
  const prs = alreadyCompleted ? [] : await notifySessionPRs(workoutId).catch(() => []);

  return Response.json({ ...updated, prs });
}
