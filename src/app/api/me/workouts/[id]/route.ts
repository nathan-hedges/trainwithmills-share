import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/me/workouts/[id] - one of MY workouts, with exercises + sets, for
// session mode. Ownership enforced via clientId.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const me = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!me) return new Response("User not found", { status: 404 });

  const { id } = await params;
  const workout = await prisma.workout.findFirst({
    where: { id, clientId: me.id },
    include: {
      checkIn: true,
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: true, sets: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!workout) return new Response("Workout not found", { status: 404 });

  return Response.json(workout);
}
