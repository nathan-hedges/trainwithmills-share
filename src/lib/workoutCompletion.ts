import { prisma } from "./prisma";
import { computeHistory } from "./analytics";
import { createNotification } from "./notifications";

export interface SessionPR {
  name: string;
  weight: number;
}
export interface CompletionResult {
  completed: boolean;
  /** PBs hit this session (heaviest first) - lets the UI celebrate them. */
  prs: SessionPR[];
}

/**
 * Auto-complete: if every exercise in the workout is either fully logged
 * (all sets completed) or opted out by the client, flip the workout to
 * "completed". Called after a set is logged and after an opt-out toggles.
 */
export async function maybeAutoComplete(workoutId: string): Promise<CompletionResult> {
  const w = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: {
      status: true,
      exercises: { select: { optedOut: true, sets: { select: { completed: true } } } },
    },
  });
  if (!w || w.status === "completed" || w.exercises.length === 0) return { completed: false, prs: [] };

  const allDone = w.exercises.every(
    (e) => e.optedOut || (e.sets.length > 0 && e.sets.every((s) => s.completed)),
  );
  if (!allDone) return { completed: false, prs: [] };

  await prisma.workout.update({ where: { id: workoutId }, data: { status: "completed" } });
  const prs = await notifySessionPRs(workoutId).catch(() => []); // best-effort - never block completion
  return { completed: true, prs };
}

/**
 * One PB notification per completed session: finds every lift whose top weight
 * in THIS session beat its previous all-time best, and notifies once with the
 * heaviest ("New PB! 60kg on Hip Thrust" + "and 2 more" when several).
 * Called exactly at the assigned/in_progress → completed transition.
 * Returns the session's PRs (heaviest first) so the UI can celebrate them.
 */
export async function notifySessionPRs(workoutId: string): Promise<SessionPR[]> {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { clientId: true, date: true },
  });
  if (!workout) return [];

  const workouts = await prisma.workout.findMany({
    where: { clientId: workout.clientId },
    select: {
      date: true,
      exercises: {
        select: {
          exercise: { select: { id: true, name: true, category: true } },
          sets: {
            select: { targetReps: true, targetRpe: true, loggedReps: true, loggedWeight: true, completed: true },
          },
        },
      },
    },
  });

  // A PR = this session's point is the series' latest AND beats every earlier point.
  const prs: SessionPR[] = [];
  for (const s of computeHistory(workouts)) {
    const last = s.points[s.points.length - 1];
    if (!last || last.date !== workout.date || s.points.length < 2) continue;
    const previousBest = Math.max(...s.points.slice(0, -1).map((p) => p.topWeight));
    if (last.topWeight > previousBest) prs.push({ name: s.exerciseName, weight: last.topWeight });
  }
  if (prs.length === 0) return [];

  prs.sort((a, b) => b.weight - a.weight);
  const top = prs[0];
  const extra = prs.length - 1;
  const title =
    extra > 0
      ? `New PB! ${top.weight}kg on ${top.name} - and ${extra} more PB${extra === 1 ? "" : "s"} this session!`
      : `New PB! ${top.weight}kg on ${top.name}!`;

  await createNotification(workout.clientId, "milestone", title, "/portal/progress");
  return prs;
}
