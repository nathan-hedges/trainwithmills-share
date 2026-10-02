import type { MetricStat, NutritionAnalytics } from "./types";

// Pure analytics over NutritionLog rows. Endpoints fetch the logs and call these.

export interface LogRow {
  date: string;
  protein: number;
  steps: number;
  sleep: number;
  water: number;
  fiveADay: number;
}

export interface DerivedGoals {
  protein: number; // bodyweight × multiplier (0 if no weight set)
  steps: number;
  sleep: number;
  water: number;
  fiveADay: number;
}

export function deriveGoals(p: {
  bodyWeightKg: number | null;
  proteinMultiplier: number;
  stepsGoal: number;
  sleepGoal: number;
  waterGoal: number;
  fiveADayGoal: number;
}): DerivedGoals {
  return {
    protein: p.bodyWeightKg ? Math.round(p.bodyWeightKg * p.proteinMultiplier) : 0,
    steps: p.stepsGoal,
    sleep: p.sleepGoal,
    water: p.waterGoal,
    fiveADay: p.fiveADayGoal,
  };
}

// n date strings (YYYY-MM-DD) ending `endOffset` days ago (0 = today), going back.
export function lastNDates(n: number, endOffset = 0): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - endOffset - i);
    out.push(d.toISOString().split("T")[0]);
  }
  return out;
}

type Key = "protein" | "steps" | "sleep" | "water" | "fiveADay";

const hasData = (l: LogRow) =>
  l.protein > 0 || l.steps > 0 || l.sleep > 0 || l.water > 0 || l.fiveADay > 0;

const hitDays = (logs: LogRow[], key: Key, goal: number) =>
  goal <= 0 ? 0 : logs.filter((l) => l[key] >= goal).length;

const pct = (count: number, total: number) => (total ? Math.round((count / total) * 100) : 0);

export function computeAnalytics(logs14: LogRow[], goals: DerivedGoals): NutritionAnalytics {
  const thisWeekDates = new Set(lastNDates(7, 0));
  const lastWeekDates = new Set(lastNDates(7, 7));

  const thisWeek = logs14.filter((l) => thisWeekDates.has(l.date) && hasData(l));
  const lastWeek = logs14.filter((l) => lastWeekDates.has(l.date) && hasData(l));

  const stat = (key: Key): MetricStat => {
    const tp = pct(hitDays(thisWeek, key, goals[key]), thisWeek.length);
    const lp = pct(hitDays(lastWeek, key, goals[key]), lastWeek.length);
    return { pct: tp, deltaVsLastWeek: tp - lp };
  };

  const avg = (logs: LogRow[], key: Key) =>
    logs.length ? logs.reduce((s, l) => s + l[key], 0) / logs.length : 0;

  return {
    daysLogged: thisWeek.length,
    proteinHitDays: hitDays(thisWeek, "protein", goals.protein),
    avgSteps: Math.round(avg(thisWeek, "steps")),
    avgSleep: Math.round(avg(thisWeek, "sleep") * 10) / 10,
    protein: stat("protein"),
    steps: stat("steps"),
    sleep: stat("sleep"),
    water: stat("water"),
    fiveADay: stat("fiveADay"),
    suggestions: buildSuggestions(logs14, thisWeek, lastWeek, goals),
  };
}

// Specific, number-rich second-person insights built from the client's own
// logged data. Returned empty when there's nothing logged (the UI falls back to
// the standard coaching tips). The coach can insert + personalise these.
function buildSuggestions(
  logs14: LogRow[],
  thisWeek: LogRow[],
  lastWeek: LogRow[],
  goals: DerivedGoals,
): string[] {
  const out: string[] = [];
  if (!thisWeek.length) return out;

  const n = thisWeek.length;
  const avg = (key: Key) => thisWeek.reduce((s, l) => s + l[key], 0) / n;
  const r1 = (x: number) => Math.round(x * 10) / 10;

  // 1. Protein -the headline metric.
  if (goals.protein > 0) {
    const hit = hitDays(thisWeek, "protein", goals.protein);
    const ap = Math.round(avg("protein"));
    if (hit >= 5) {
      out.push(`Strong protein week - you hit your ${goals.protein}g target on ${hit} of ${n} logged days.`);
    } else if (ap > 0 && ap < goals.protein) {
      out.push(
        `You're averaging ${ap}g protein, ${goals.protein - ap}g under your ${goals.protein}g target - one more protein-rich snack a day would close it.`,
      );
    }
  }

  // 2. Steps.
  if (goals.steps > 0) {
    const as = Math.round(avg("steps"));
    if (as >= goals.steps) {
      out.push(`Steps are dialled in - averaging ${as.toLocaleString()} a day, at or above your ${goals.steps.toLocaleString()} goal.`);
    } else if (as > 0) {
      out.push(
        `Averaging ${as.toLocaleString()} steps - about ${(goals.steps - as).toLocaleString()} short of your ${goals.steps.toLocaleString()} goal. A 15-min walk after training would bridge it.`,
      );
    }
  }

  // 3. Sleep.
  if (goals.sleep > 0) {
    const asl = r1(avg("sleep"));
    if (asl >= goals.sleep) {
      out.push(`Sleep is on point at ${asl}h on average - that's where your recovery and gains come from.`);
    } else if (asl > 0) {
      out.push(`Sleep is averaging ${asl}h vs your ${goals.sleep}h goal - even 30 minutes earlier would lift your training quality.`);
    }
  }

  // 4. Water.
  if (goals.water > 0) {
    const aw = r1(avg("water"));
    if (aw > 0 && aw < goals.water) {
      out.push(`Hydration's a little behind at ${aw}L a day vs your ${goals.water}L goal - keep a bottle on your desk as a nudge.`);
    }
  }

  // 5. 5-a-day.
  if (goals.fiveADay > 0) {
    const af = r1(avg("fiveADay"));
    if (af > 0 && af < goals.fiveADay) {
      out.push(`You're getting ${af} of your ${goals.fiveADay}-a-day on average - one extra portion per meal nails it.`);
    }
  }

  // 6. Sleep × protein correlation (needs a spread of good/short nights).
  const logged14 = logs14.filter(hasData);
  if (goals.protein > 0 && goals.sleep > 0) {
    const good = logged14.filter((l) => l.sleep >= goals.sleep);
    const poor = logged14.filter((l) => l.sleep > 0 && l.sleep < goals.sleep);
    if (good.length >= 2 && poor.length >= 2) {
      const gh = pct(good.filter((l) => l.protein >= goals.protein).length, good.length);
      const ph = pct(poor.filter((l) => l.protein >= goals.protein).length, poor.length);
      if (gh - ph >= 20) {
        out.push(`On nights you sleep ${goals.sleep}h+, you hit your protein goal ${gh}% of the time - vs ${ph}% on short sleep.`);
      }
    }
  }

  // 7. Week-over-week protein movement.
  if (goals.protein > 0 && lastWeek.length) {
    const tp = pct(hitDays(thisWeek, "protein", goals.protein), n);
    const lp = pct(hitDays(lastWeek, "protein", goals.protein), lastWeek.length);
    if (tp - lp >= 15) out.push(`Protein adherence is up ${tp - lp}% on last week - real momentum, keep it rolling.`);
    else if (lp - tp >= 15) out.push(`Protein adherence dipped ${lp - tp}% from last week - worth a quick check-in on what changed.`);
  }

  // 8. Consistency.
  if (n < 4) {
    out.push(`Only ${n}/7 days logged this week - more consistent logging will sharpen these insights.`);
  }

  return out;
}

export function computeOverview(logs14: LogRow[], goals: DerivedGoals) {
  const a = computeAnalytics(logs14, goals);
  const d = a.protein.deltaVsLastWeek;
  const trend: "up" | "down" | "flat" = d >= 5 ? "up" : d <= -5 ? "down" : "flat";
  return {
    proteinCompliance: a.protein.pct,
    habits: { steps: a.steps.pct, sleep: a.sleep.pct, water: a.water.pct, fiveADay: a.fiveADay.pct },
    trend,
  };
}
