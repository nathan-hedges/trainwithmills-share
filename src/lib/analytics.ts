/**
 * Analytics computed from a client's real logged workouts. This is what powers
 * the original portal charts/metrics (adherence, consistency, progression, PRs)
 * now that the data is real instead of mocked.
 */

export interface RawSet {
  targetReps: number;
  targetRpe: string | null;
  loggedReps: number | null;
  loggedWeight: number | null;
  completed: boolean;
}
export interface RawExercise {
  exercise: { id: string; name: string; category: string };
  sets: RawSet[];
}
export interface RawWorkout {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  focus: string;
  status: string;
  checkIn: { energy: number | null; energyBefore?: number | null; cyclePhase: string; note: string | null } | null;
  exercises: RawExercise[];
}

export interface WeeklyStat {
  weekLabel: string;
  completed: number;
  planned: number;
  volume: number;
}
export interface ProgressPoint {
  date: string;
  topWeight: number;
  est1rm: number;
}
export interface ProgressSeries {
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: string;
  points: ProgressPoint[];
}
export interface RecentSession {
  id: string;
  title: string;
  date: string;
  exerciseCount: number;
  checkIn: RawWorkout["checkIn"];
}
export interface ClientAnalytics {
  adherence: number;
  consistency: WeeklyStat[];
  history: ProgressSeries[];
  recent: RecentSession[];
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function mondayOf(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
}
function epley(weight: number, reps: number) {
  return Math.round(weight * (1 + reps / 30));
}

/** % of assigned sets completed over the trailing `days` (default 28). */
export function computeAdherence(
  workouts: { date: string; exercises: { sets: { completed: boolean }[] }[] }[],
  days = 28,
): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = toISO(cutoff);
  let total = 0;
  let done = 0;
  for (const w of workouts) {
    if (w.date < cutoffISO) continue;
    for (const e of w.exercises)
      for (const s of e.sets) {
        total++;
        if (s.completed) done++;
      }
  }
  return total ? Math.round((done / total) * 100) : 0;
}

/** Last `weeks` weeks (oldest -> newest): planned vs completed sessions + volume (tonnes). */
export function computeConsistency(workouts: RawWorkout[], weeks = 8): WeeklyStat[] {
  const thisMonday = mondayOf(new Date());
  const out: WeeklyStat[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const monday = new Date(thisMonday);
    monday.setDate(thisMonday.getDate() - i * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const a = toISO(monday);
    const b = toISO(sunday);
    const wk = workouts.filter((w) => w.date >= a && w.date <= b);
    const completedW = wk.filter((w) => w.status === "completed");
    let volume = 0;
    for (const w of completedW)
      for (const e of w.exercises)
        for (const s of e.sets) {
          if (s.completed && s.loggedWeight && s.loggedReps) volume += s.loggedWeight * s.loggedReps;
        }
    out.push({
      weekLabel: monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      planned: wk.length,
      completed: completedW.length,
      volume: Math.round((volume / 1000) * 10) / 10,
    });
  }
  return out;
}

/**
 * Per-exercise strength history from completed, weight-logged sets. Only needs
 * date + exercises + sets (not check-ins), so the input is kept narrow - callers
 * can pass any workout query that includes exercises with their library exercise.
 */
export function computeHistory(
  workouts: {
    date: string;
    exercises: { exercise: { id: string; name: string; category: string }; sets: RawSet[] }[];
  }[],
): ProgressSeries[] {
  const sorted = [...workouts].sort((x, y) => x.date.localeCompare(y.date));
  const map = new Map<string, ProgressSeries>();
  for (const w of sorted) {
    for (const e of w.exercises) {
      let topW = 0;
      let topReps = 0;
      for (const s of e.sets) {
        if (s.completed && s.loggedWeight != null && s.loggedWeight > topW) {
          topW = s.loggedWeight;
          topReps = s.loggedReps ?? s.targetReps;
        }
      }
      if (topW <= 0) continue;
      let series = map.get(e.exercise.id);
      if (!series) {
        series = {
          exerciseId: e.exercise.id,
          exerciseName: e.exercise.name,
          exerciseCategory: e.exercise.category,
          points: [],
        };
        map.set(e.exercise.id, series);
      }
      const point = { date: w.date, topWeight: topW, est1rm: epley(topW, topReps) };
      const last = series.points[series.points.length - 1];
      if (last && last.date === w.date) series.points[series.points.length - 1] = point;
      else series.points.push(point);
    }
  }
  return [...map.values()].filter((s) => s.points.length > 0);
}

/** Completed sessions, newest first. */
export function computeRecent(workouts: RawWorkout[], limit = 6): RecentSession[] {
  return workouts
    .filter((w) => w.status === "completed")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((w) => ({
      id: w.id,
      title: w.title,
      date: w.date,
      exerciseCount: w.exercises.length,
      checkIn: w.checkIn,
    }));
}

export function computeAnalytics(workouts: RawWorkout[]): ClientAnalytics {
  return {
    adherence: computeAdherence(workouts),
    consistency: computeConsistency(workouts),
    history: computeHistory(workouts),
    recent: computeRecent(workouts),
  };
}

/** Today's session status for the roster table: "rest" | "assigned" | "in_progress" | "completed". */
export function todayStatus(workouts: { date: string; status: string }[], todayISO: string): string {
  const w = workouts.find((x) => x.date === todayISO);
  return w ? w.status : "rest";
}

// ── Weekly summaries (the data behind the emailed digest) ───────────

// The digest runs Monday morning (vercel.json cron), so "the week" it recaps
// is the one that just finished: last Monday → last Sunday.
function lastWeekBounds(): { a: string; b: string; label: string } {
  const monday = mondayOf(new Date());
  monday.setDate(monday.getDate() - 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return { a: toISO(monday), b: toISO(sunday), label: `${fmt(monday)} – ${fmt(sunday)}` };
}

export interface ClientWeeklySummary {
  weekLabel: string;
  sessionsCompleted: number;
  sessionsPlanned: number;
  adherence: number; // % of this week's sets completed
  volume: number; // tonnes this week
  prs: number; // PRs hit this week
  topLifts: { name: string; weight: number }[];
}

/** One client's just-finished week (for their Monday summary email). */
export function clientWeeklySummary(workouts: RawWorkout[]): ClientWeeklySummary {
  const { a, b, label } = lastWeekBounds();
  const week = workouts.filter((w) => w.date >= a && w.date <= b);

  let total = 0;
  let done = 0;
  let volume = 0;
  const liftMax = new Map<string, number>();
  for (const w of week) {
    for (const e of w.exercises) {
      for (const s of e.sets) {
        total++;
        if (s.completed) {
          done++;
          if (s.loggedWeight && s.loggedReps) volume += s.loggedWeight * s.loggedReps;
          if (s.loggedWeight) liftMax.set(e.exercise.name, Math.max(liftMax.get(e.exercise.name) ?? 0, s.loggedWeight));
        }
      }
    }
  }

  // A PR = a lift whose newest (recap-week) top weight beat its previous best.
  // Anything logged after the recap week (e.g. Monday morning before the cron
  // fires) is excluded so it can't mask last week's PRs.
  let prs = 0;
  for (const s of computeHistory(workouts.filter((w) => w.date <= b))) {
    const last = s.points[s.points.length - 1];
    if (last && last.date >= a && last.date <= b && s.points.length > 1) {
      const prevMax = Math.max(...s.points.slice(0, -1).map((p) => p.topWeight));
      if (last.topWeight > prevMax) prs++;
    }
  }

  const topLifts = [...liftMax.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 3)
    .map(([name, weight]) => ({ name, weight }));

  return {
    weekLabel: label,
    sessionsCompleted: week.filter((w) => w.status === "completed").length,
    sessionsPlanned: week.length,
    adherence: total ? Math.round((done / total) * 100) : 0,
    volume: Math.round((volume / 1000) * 10) / 10,
    prs,
    topLifts,
  };
}

export interface CoachWeeklyRow {
  clientId: string;
  name: string;
  sessionsCompleted: number;
  sessionsPlanned: number;
  adherence: number;
  flag: "on-track" | "low" | "inactive";
}
export interface CoachWeeklySummary {
  weekLabel: string;
  totalClients: number;
  avgAdherence: number;
  rows: CoachWeeklyRow[];
}

/** Every client's just-finished week, digested for the coach's summary email. */
export function coachWeeklySummary(
  clients: { clientId: string; name: string; workouts: RawWorkout[] }[],
): CoachWeeklySummary {
  const { a, b, label } = lastWeekBounds();
  const rows: CoachWeeklyRow[] = clients.map((c) => {
    const week = c.workouts.filter((w) => w.date >= a && w.date <= b);
    let total = 0;
    let done = 0;
    for (const w of week) for (const e of w.exercises) for (const s of e.sets) {
      total++;
      if (s.completed) done++;
    }
    const adherence = total ? Math.round((done / total) * 100) : 0;
    const sessionsCompleted = week.filter((w) => w.status === "completed").length;
    const sessionsPlanned = week.length;
    const flag: CoachWeeklyRow["flag"] =
      sessionsPlanned === 0 && sessionsCompleted === 0 ? "inactive" : adherence < 55 ? "low" : "on-track";
    return { clientId: c.clientId, name: c.name, sessionsCompleted, sessionsPlanned, adherence, flag };
  });
  const avgAdherence = rows.length ? Math.round(rows.reduce((n, r) => n + r.adherence, 0) / rows.length) : 0;
  return { weekLabel: label, totalClients: rows.length, avgAdherence, rows };
}
