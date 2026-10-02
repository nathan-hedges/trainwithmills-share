import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeAnalytics } from "@/lib/analytics";

// GET /api/me/analytics -the signed-in client's own real metrics.
export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return new Response("User not found", { status: 404 });

  const workouts = await prisma.workout.findMany({
    where: { clientId: me.id },
    include: { checkIn: true, exercises: { include: { exercise: true, sets: true } } },
  });
  return Response.json(computeAnalytics(workouts));
}
