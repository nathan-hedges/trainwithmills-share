import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeAnalytics } from "@/lib/analytics";

// GET /api/clients/[id]/analytics -coach view of one client's real metrics.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;
  const workouts = await prisma.workout.findMany({
    where: { clientId: id },
    include: { checkIn: true, exercises: { include: { exercise: true, sets: true } } },
  });
  return Response.json(computeAnalytics(workouts));
}
