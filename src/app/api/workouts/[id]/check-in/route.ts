import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const clamp = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n) : null;
};

/**
 * PUT /api/workouts/[id]/check-in - the client saves their session check-in.
 *
 * Two moments write to the same row:
 *   before: { energyBefore, cyclePhase }  - captured as she starts
 *   after:  { energy, note }              - "how do you feel now"
 * Only the fields present in the body are written, so one never wipes the other.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const me = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!me) return new Response("User not found", { status: 404 });

  const { id: workoutId } = await params;
  const body = await req.json().catch(() => ({}));

  // Ownership: only let the client check in on their OWN workout.
  const owned = await prisma.workout.findFirst({ where: { id: workoutId, clientId: me.id } });
  if (!owned) return new Response("Workout not found", { status: 403 });

  const data: {
    energyBefore?: number | null;
    energy?: number | null;
    cyclePhase?: string;
    note?: string | null;
  } = {};
  if ("energyBefore" in body) data.energyBefore = clamp(body.energyBefore);
  if ("energy" in body) data.energy = clamp(body.energy);
  if ("cyclePhase" in body) data.cyclePhase = body.cyclePhase ?? "none";
  if ("note" in body) data.note = body.note ?? null;

  if (Object.keys(data).length === 0) {
    return new Response("Nothing to save", { status: 400 });
  }

  // upsert = create the check-in if missing, otherwise update it. Works because
  // CheckIn.workoutId is @unique (one check-in per workout).
  const checkIn = await prisma.checkIn.upsert({
    where: { workoutId },
    create: { workoutId, ...data },
    update: data,
  });
  return Response.json(checkIn);
}
