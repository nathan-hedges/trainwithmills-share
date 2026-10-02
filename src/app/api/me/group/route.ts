import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { programmeLastDay, PROGRAMME_DAYS } from "@/lib/billing";

const isoDay = (d: Date) => d.toISOString().split("T")[0];

/** "Sophie B." - friendly but distinct within a group of 12. */
function displayName(u: { firstName: string | null; lastName: string | null; email?: string }) {
  const first = u.firstName?.trim();
  const lastInitial = u.lastName?.trim()?.[0];
  if (first) return lastInitial ? `${first} ${lastInitial}.` : first;
  return "A member";
}

// GET /api/me/group - everything the My Group page shows: the group itself,
// week number, call details, leaderboard, recent wins and lessons.
export async function GET() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const meRow = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      group: {
        select: {
          id: true,
          name: true,
          startDate: true,
          callSchedule: true,
          callLink: true,
          members: {
            select: { id: true, firstName: true, lastName: true, avatarKey: true },
            orderBy: { firstName: "asc" },
          },
          lessons: {
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true, notes: true, link: true, createdAt: true },
          },
        },
      },
    },
  });
  if (!meRow) return new Response("Unauthorized", { status: 401 });
  if (!meRow.group) return new Response("You're not in a group", { status: 404 });
  const group = meRow.group;

  // Programme window in UTC day strings (same convention as workout dates).
  const startISO = isoDay(group.startDate);
  const endISO = isoDay(programmeLastDay(group.startDate));
  const todayISO = isoDay(new Date());
  const windowEnd = todayISO < endISO ? todayISO : endISO;

  // Week number 1..6, clamped for pre-start and post-end views.
  const daysIn = Math.floor(
    (new Date(`${todayISO}T00:00:00Z`).getTime() - new Date(`${startISO}T00:00:00Z`).getTime()) / 86_400_000,
  );
  const weekNumber = Math.min(Math.max(Math.floor(daysIn / 7) + 1, 1), PROGRAMME_DAYS / 7);

  // This week's Monday (local, matching how workout dates are written).
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const mondayISO = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;

  // One query: every member's completed sessions inside the programme window,
  // with top-weight data for the wins strip.
  const memberIds = group.members.map((m) => m.id);
  const workouts = await prisma.workout.findMany({
    where: { clientId: { in: memberIds }, status: "completed", date: { gte: startISO, lte: windowEnd } },
    select: {
      clientId: true,
      date: true,
      exercises: {
        select: {
          exercise: { select: { name: true } },
          sets: { select: { completed: true, loggedWeight: true } },
        },
      },
    },
  });

  // Leaderboard: sessions completed this programme (+ this week's count).
  const totals = new Map<string, { total: number; thisWeek: number }>();
  for (const id of memberIds) totals.set(id, { total: 0, thisWeek: 0 });
  for (const w of workouts) {
    const t = totals.get(w.clientId);
    if (!t) continue;
    t.total++;
    if (w.date >= mondayISO) t.thisWeek++;
  }
  const leaderboard = group.members
    .map((m) => ({
      id: m.id,
      name: displayName(m),
      hasAvatar: Boolean(m.avatarKey),
      mine: m.id === meRow.id,
      total: totals.get(m.id)?.total ?? 0,
      thisWeek: totals.get(m.id)?.thisWeek ?? 0,
    }))
    .sort((a, b) => b.total - a.total || b.thisWeek - a.thisWeek || a.name.localeCompare(b.name));

  // Recent wins: a lift in the last 14 days that beat that member's previous
  // best earlier in the programme (so week 1 doesn't count everything as a PB).
  const recentCutoffDate = new Date(`${todayISO}T00:00:00Z`);
  recentCutoffDate.setUTCDate(recentCutoffDate.getUTCDate() - 13);
  const recentCutoff = isoDay(recentCutoffDate);

  // member -> exercise -> [{date, top}]
  const lifts = new Map<string, Map<string, { date: string; top: number }[]>>();
  for (const w of workouts) {
    for (const e of w.exercises) {
      let top = 0;
      for (const s of e.sets) if (s.completed && s.loggedWeight && s.loggedWeight > top) top = s.loggedWeight;
      if (top <= 0) continue;
      const byExercise = lifts.get(w.clientId) ?? new Map();
      lifts.set(w.clientId, byExercise);
      const arr = byExercise.get(e.exercise.name) ?? [];
      arr.push({ date: w.date, top });
      byExercise.set(e.exercise.name, arr);
    }
  }
  const wins: { name: string; exercise: string; weight: number }[] = [];
  for (const m of group.members) {
    const byExercise = lifts.get(m.id);
    if (!byExercise) continue;
    for (const [exercise, entries] of byExercise) {
      let before = 0;
      let recent = 0;
      let hadEarlier = false;
      for (const e of entries) {
        if (e.date < recentCutoff) {
          hadEarlier = true;
          if (e.top > before) before = e.top;
        } else if (e.top > recent) {
          recent = e.top;
        }
      }
      if (hadEarlier && recent > before) wins.push({ name: displayName(m), exercise, weight: recent });
    }
  }
  wins.sort((a, b) => b.weight - a.weight);

  return Response.json({
    group: {
      name: group.name,
      startDate: group.startDate,
      callSchedule: group.callSchedule,
      callLink: group.callLink,
      memberCount: group.members.length,
    },
    weekNumber,
    totalWeeks: PROGRAMME_DAYS / 7,
    startISO,
    endISO,
    leaderboard,
    wins: wins.slice(0, 6),
    lessons: group.lessons,
  });
}
