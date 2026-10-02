import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { maybeAutoComplete } from "@/lib/workoutCompletion";

// POST /api/workout-exercises/[id]/opt-out — the CLIENT opts out of (or back
// into) one exercise in their session, with an optional note for the coach.
// Body: { optedOut: boolean, note?: string }. Returns { optedOut, optOutNote,
// workoutCompleted } so the UI can react if this finished the whole session.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const me = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!me) return new Response("User not found", { status: 404 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const optedOut = Boolean(body.optedOut);
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  // Ownership: exercise → workout → clientId must be me.
  const owned = await prisma.workoutExercise.findFirst({
    where: { id, workout: { clientId: me.id } },
    select: { workoutId: true },
  });
  if (!owned) return new Response("Exercise not found", { status: 403 });

  const updated = await prisma.workoutExercise.update({
    where: { id },
    data: { optedOut, optOutNote: optedOut ? note : null }, // undo clears the note
  });

  // Opting out counts as engaging with the session.
  await prisma.workout.updateMany({
    where: { id: owned.workoutId, status: "assigned" },
    data: { status: "in_progress" },
  });

  const completion = await maybeAutoComplete(owned.workoutId);

  return Response.json({
    optedOut: updated.optedOut,
    optOutNote: updated.optOutNote,
    workoutCompleted: completion.completed,
    prs: completion.prs,
  });
}
