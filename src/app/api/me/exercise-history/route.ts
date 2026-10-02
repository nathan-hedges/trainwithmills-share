import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/me/exercise-history - the signed-in client's last logged top set per
// exercise (for session-mode prefill + the "last time" line). Mirrors the
// coach's /api/clients/[id]/exercise-history.
export async function GET() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const me = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!me) return new Response("User not found", { status: 404 });

  const workouts = await prisma.workout.findMany({
    where: { clientId: me.id },
    orderBy: { date: "desc" },
    select: {
      date: true,
      exercises: {
        select: { exerciseId: true, sets: { select: { loggedWeight: true, loggedReps: true, completed: true } } },
      },
    },
  });

  const map: Record<string, { date: string; topWeight: number; topReps: number }> = {};

  for (const w of workouts) {
    for (const e of w.exercises) {
      if (map[e.exerciseId]) continue; // newest-first: first hit wins

      let topWeight = 0;
      let topReps = 0;
      let anyLogged = false;
      for (const s of e.sets) {
        if (s.completed && s.loggedWeight != null) {
          anyLogged = true;
          if (s.loggedWeight > topWeight) {
            topWeight = s.loggedWeight;
            topReps = s.loggedReps ?? 0;
          }
        }
      }
      if (!anyLogged) continue;
      map[e.exerciseId] = { date: w.date, topWeight, topReps };
    }
  }

  return Response.json(map);
}
