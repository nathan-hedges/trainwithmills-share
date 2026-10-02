import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/clients/[id]/exercise-history - for the builder's progressive-overload
// hints. Returns a map of exerciseId → the client's most recent logged top set
// plus a suggested next load (double progression: nudge up when they completed
// every set last time, otherwise hold). Coach-only.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") return new Response("Forbidden", { status: 403 });

  const { id: clientId } = await params;

  const workouts = await prisma.workout.findMany({
    where: { clientId },
    orderBy: { date: "desc" },
    select: {
      date: true,
      exercises: {
        select: { exerciseId: true, sets: { select: { loggedWeight: true, loggedReps: true, completed: true } } },
      },
    },
  });

  const map: Record<
    string,
    { date: string; topWeight: number; topReps: number; allDone: boolean; suggestion: number }
  > = {};

  for (const w of workouts) {
    for (const e of w.exercises) {
      if (map[e.exerciseId]) continue; // workouts are newest-first, so keep the first hit

      let topWeight = 0;
      let topReps = 0;
      let anyLogged = false;
      let allDone = e.sets.length > 0;
      for (const s of e.sets) {
        if (s.completed && s.loggedWeight != null) {
          anyLogged = true;
          if (s.loggedWeight > topWeight) {
            topWeight = s.loggedWeight;
            topReps = s.loggedReps ?? 0;
          }
        }
        if (!s.completed) allDone = false;
      }
      if (!anyLogged) continue; // nothing logged that day - look further back

      const suggestion = allDone ? Math.round((topWeight + 2.5) * 2) / 2 : topWeight;
      map[e.exerciseId] = { date: w.date, topWeight, topReps, allDone, suggestion };
    }
  }

  return Response.json(map);
}
