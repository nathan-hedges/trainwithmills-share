import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/clients/[id]/sessions -coach view of a client's recent sessions
// with everything they logged (per-set actuals, completion, check-in, warmup).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;

  const sessions = await prisma.workout.findMany({
    where: { clientId: id },
    orderBy: { date: "desc" },
    take: 30,
    include: {
      checkIn: true,
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: true, sets: { orderBy: { order: "asc" } } },
      },
    },
  });

  return Response.json(sessions);
}
