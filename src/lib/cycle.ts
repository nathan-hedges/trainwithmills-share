/**
 * Cycle tracking maths. Pure functions over day-strings (YYYY-MM-DD, UTC) so it
 * matches the Workout.date convention used everywhere else.
 *
 * Honest limits, deliberately built in:
 *  - Phase prediction only runs for contraception that neither suppresses
 *    ovulation nor masks the bleed pattern we predict from. Everyone else gets
 *    bleed + symptom tracking with no invented phases.
 *  - Predictions are an estimate from her own recent cycles, never a claim
 *    about fertility, and never a medical opinion.
 */

export type Phase = "menstrual" | "follicular" | "ovulation" | "luteal";
export type Flow = "light" | "medium" | "heavy";

export interface ContraceptionOption {
  value: string;
  label: string;
  /** False = we can predict phases; true = bleeds/symptoms only. */
  blocksPrediction: boolean;
  /** Shown to the client when prediction is off, so it never feels broken. */
  note?: string;
}

export const CONTRACEPTION: ContraceptionOption[] = [
  { value: "none", label: "None / natural cycle", blocksPrediction: false },
  { value: "copper_iud", label: "Copper coil (non-hormonal)", blocksPrediction: false },
  {
    value: "combined_pill",
    label: "Combined pill",
    blocksPrediction: true,
    note: "The combined pill stops ovulation, so the bleed you get is a withdrawal bleed rather than a natural cycle. Phase predictions wouldn't mean anything - but tracking how you feel across the month still tells us plenty.",
  },
  {
    value: "mini_pill",
    label: "Mini pill (progestogen-only)",
    blocksPrediction: true,
    note: "On the mini pill, ovulation and bleeding patterns vary a lot from person to person, so predicted phases wouldn't be reliable. Tracking symptoms and energy still helps us spot your patterns.",
  },
  {
    value: "hormonal_iud",
    label: "Hormonal coil (Mirena, Kyleena…)",
    blocksPrediction: true,
    note: "The hormonal coil often makes bleeds much lighter or stops them altogether, so there's no reliable pattern to predict from. Symptom tracking is still worth doing.",
  },
  {
    value: "implant",
    label: "Implant",
    blocksPrediction: true,
    note: "The implant stops ovulation and makes bleeding unpredictable, so phase predictions wouldn't be meaningful. How you feel week to week still is.",
  },
  {
    value: "injection",
    label: "Injection (Depo)",
    blocksPrediction: true,
    note: "The injection stops ovulation and usually stops periods, so there's no cycle to predict. Tracking symptoms and energy still helps.",
  },
  {
    value: "other",
    label: "Something else",
    blocksPrediction: true,
    note: "We'll keep this to tracking your bleeds and symptoms rather than predicting phases - I can talk it through with you.",
  },
];

export const contraceptionInfo = (v: string) =>
  CONTRACEPTION.find((c) => c.value === v) ?? CONTRACEPTION[CONTRACEPTION.length - 1];

export const SYMPTOMS = [
  "Cramps",
  "Headache",
  "Bloating",
  "Fatigue",
  "Low mood",
  "Cravings",
  "Sore breasts",
  "Poor sleep",
  "Back ache",
  "Nausea",
] as const;

export const PHASE_LABEL: Record<Phase, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulation: "Ovulation",
  luteal: "Luteal",
};

// ── day-string helpers (UTC) ────────────────────────────────────────
export const dayKey = (d: Date) => d.toISOString().split("T")[0];
export const today = () => dayKey(new Date());
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

export function addDays(day: string, n: number): string {
  const d = asDate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return dayKey(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((asDate(to).getTime() - asDate(from).getTime()) / 86_400_000);
}

export interface LogRow {
  date: string;
  flow: string | null;
}

/**
 * Period start days, oldest first. A period is a run of consecutive logged
 * flow days; a single skipped day inside a bleed does not split it in two.
 */
export function periodStarts(logs: LogRow[]): string[] {
  const bleeds = logs
    .filter((l) => l.flow)
    .map((l) => l.date)
    .sort();
  const starts: string[] = [];
  let previous: string | null = null;
  for (const day of bleeds) {
    if (previous === null || daysBetween(previous, day) > 2) starts.push(day);
    previous = day;
  }
  return starts;
}

/** Average of her last `max` cycle lengths, or null when we have fewer than two starts. */
export function averageCycleLength(starts: string[], max = 6): number | null {
  if (starts.length < 2) return null;
  const gaps: number[] = [];
  for (let i = starts.length - 1; i > 0 && gaps.length < max; i--) {
    const gap = daysBetween(starts[i - 1], starts[i]);
    // Ignore implausible gaps so one missed month cannot skew the average.
    if (gap >= 15 && gap <= 60) gaps.push(gap);
  }
  if (gaps.length === 0) return null;
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

export interface CycleProfileLike {
  contraception: string;
  avgCycleLength: number;
  avgPeriodLength: number;
}

export interface Prediction {
  /** False when contraception makes phases meaningless - the UI hides them. */
  predicts: boolean;
  /** Day 1 = the first day of her most recent period. Null until she logs one. */
  cycleDay: number | null;
  phase: Phase | null;
  cycleLength: number;
  /** True when the length came from her own logs rather than the default. */
  fromHerData: boolean;
  lastPeriodStart: string | null;
  nextPeriodStart: string | null;
  daysUntilNextPeriod: number | null;
  /** Bleeding for an unusually long stretch, or no period for 90+ days. */
  concern: "none" | "no-period-90" | "long-bleed";
}

/**
 * Where she is on a given day. `asOf` exists so the coach's programming overlay
 * can ask about any date, not just today.
 */
export function predict(profile: CycleProfileLike, logs: LogRow[], asOf = today()): Prediction {
  const info = contraceptionInfo(profile.contraception);
  const starts = periodStarts(logs);
  const lastStart = [...starts].reverse().find((s) => s <= asOf) ?? null;

  const measured = averageCycleLength(starts);
  const cycleLength = measured ?? profile.avgCycleLength;

  const base: Prediction = {
    predicts: !info.blocksPrediction,
    cycleDay: null,
    phase: null,
    cycleLength,
    fromHerData: measured != null,
    lastPeriodStart: lastStart,
    nextPeriodStart: null,
    daysUntilNextPeriod: null,
    concern: concernFrom(logs, starts, asOf, info.blocksPrediction),
  };

  if (!lastStart) return base;

  base.cycleDay = daysBetween(lastStart, asOf) + 1;

  if (info.blocksPrediction) return base; // bleeds tracked, phases not claimed

  base.nextPeriodStart = addDays(lastStart, cycleLength);
  base.daysUntilNextPeriod = daysBetween(asOf, base.nextPeriodStart);

  // Bleeding days come from her logs where we have them, her average otherwise.
  const bleedingToday = logs.some((l) => l.date === asOf && l.flow);
  const periodLength = Math.max(1, profile.avgPeriodLength);

  // Ovulation is roughly 14 days before the next period, with a day either side.
  const ovulationDay = cycleLength - 14;

  if (bleedingToday || base.cycleDay <= periodLength) base.phase = "menstrual";
  else if (base.cycleDay < ovulationDay - 1) base.phase = "follicular";
  else if (base.cycleDay <= ovulationDay + 1) base.phase = "ovulation";
  else base.phase = "luteal";

  return base;
}

/** Gentle flags - never a diagnosis, always "worth mentioning". */
function concernFrom(
  logs: LogRow[],
  starts: string[],
  asOf: string,
  blocksPrediction: boolean,
): Prediction["concern"] {
  // 8+ consecutive bleed days is worth a word regardless of contraception.
  const bleeds = logs
    .filter((l) => l.flow)
    .map((l) => l.date)
    .sort();
  let run = 0;
  let previous: string | null = null;
  for (const day of bleeds) {
    run = previous && daysBetween(previous, day) === 1 ? run + 1 : 1;
    if (run >= 8) return "long-bleed";
    previous = day;
  }

  // No period for 90+ days only means something when a bleed was expected.
  if (blocksPrediction) return "none";
  const last = [...starts].reverse().find((s) => s <= asOf);
  if (last && daysBetween(last, asOf) >= 90) return "no-period-90";
  return "none";
}

/** Phase on a given date - used by the coach's programming overlay. */
export function phaseOn(profile: CycleProfileLike, logs: LogRow[], day: string): Phase | null {
  return predict(profile, logs, day).phase;
}

// ── Her own patterns (from data the portal already collects) ────────
export interface EnergyByPhase {
  phase: Phase;
  average: number;
  sessions: number;
}

/**
 * Average post-workout energy (1-5) grouped by the phase she was in that day.
 * This is the payoff of tracking: her real pattern, not a generic claim.
 */
export function energyByPhase(
  profile: CycleProfileLike,
  logs: LogRow[],
  checkIns: { date: string; energy: number }[],
): EnergyByPhase[] {
  const buckets = new Map<Phase, number[]>();
  for (const c of checkIns) {
    const phase = phaseOn(profile, logs, c.date);
    if (!phase) continue;
    const arr = buckets.get(phase) ?? [];
    arr.push(c.energy);
    buckets.set(phase, arr);
  }
  const order: Phase[] = ["menstrual", "follicular", "ovulation", "luteal"];
  const out: EnergyByPhase[] = [];
  for (const phase of order) {
    const values = buckets.get(phase);
    if (!values || values.length === 0) continue;
    out.push({
      phase,
      average: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
      sessions: values.length,
    });
  }
  return out;
}

// ── Sharing levels ──────────────────────────────────────────────────
export type ShareLevel = "private" | "minimal" | "full";

export const SHARE_LEVELS: { value: ShareLevel; title: string; desc: string }[] = [
  {
    value: "private",
    title: "Just for me",
    desc: "I won't see any of it - not your phase, not your symptoms. This stays entirely yours.",
  },
  {
    value: "minimal",
    title: "The basics",
    desc: "Your phase, cycle day and energy pattern - enough for me to programme around.",
  },
  {
    value: "full",
    title: "Everything",
    desc: "Also your symptoms and notes, so she can coach around how you actually feel.",
  },
];

// ── Calendar helpers ────────────────────────────────────────────────

/** Every day of the month grid containing `anchor`, padded to whole Mon-Sun weeks. */
export function monthGrid(anchor: string): { days: string[]; monthStart: string } {
  const d = asDate(anchor);
  const monthStart = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const first = asDate(monthStart);
  // getUTCDay: 0=Sun..6=Sat -> shift so Monday starts the week.
  const lead = (first.getUTCDay() + 6) % 7;
  const start = addDays(monthStart, -lead);
  const days: string[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(start, i));
  return { days, monthStart };
}

export const monthOf = (day: string) => day.slice(0, 7);

/**
 * The days we EXPECT her next period to cover, for the calendar's soft outlines.
 * Only for cycles we can actually predict, and strictly in the future - if she's
 * overdue, `nextPeriodStart` is already behind us and those days are history,
 * not a prediction.
 */
export function predictedPeriodDays(p: Prediction, periodLength: number, cycles = 3, asOf = today()): string[] {
  if (!p.predicts || !p.nextPeriodStart) return [];
  const out: string[] = [];
  for (let c = 0; c < cycles; c++) {
    const start = addDays(p.nextPeriodStart, c * p.cycleLength);
    for (let i = 0; i < Math.max(1, periodLength); i++) out.push(addDays(start, i));
  }
  return out.filter((d) => d > asOf);
}

/**
 * Estimated ovulation days ahead (14 days before each expected period). The
 * first one often belongs to the cycle she's already in, so past days are
 * dropped - we only ever mark what's still coming.
 */
export function predictedOvulationDays(p: Prediction, cycles = 3, asOf = today()): string[] {
  if (!p.predicts || !p.nextPeriodStart) return [];
  const out: string[] = [];
  for (let c = 0; c < cycles; c++) {
    out.push(addDays(p.nextPeriodStart, c * p.cycleLength - 14));
  }
  return out.filter((d) => d > asOf);
}

// ── Patterns (the "this is you, not a textbook" layer) ──────────────

export interface SymptomPattern {
  symptom: string;
  /** % of that phase's logged days where she recorded it. */
  pct: number;
  days: number;
  phase: Phase;
}

/**
 * Her most frequent symptoms per phase. Only counts phases with enough logged
 * days to say anything honest (default 3).
 */
export function symptomPatterns(
  profile: CycleProfileLike,
  logs: { date: string; flow: string | null; symptoms: string[] }[],
  minDays = 3,
): SymptomPattern[] {
  const bleedLogs: LogRow[] = logs.map((l) => ({ date: l.date, flow: l.flow }));
  const perPhase = new Map<Phase, { total: number; counts: Map<string, number> }>();

  for (const l of logs) {
    const phase = phaseOn(profile, bleedLogs, l.date);
    if (!phase) continue;
    const bucket = perPhase.get(phase) ?? { total: 0, counts: new Map<string, number>() };
    bucket.total++;
    for (const s of l.symptoms) bucket.counts.set(s, (bucket.counts.get(s) ?? 0) + 1);
    perPhase.set(phase, bucket);
  }

  const out: SymptomPattern[] = [];
  for (const [phase, bucket] of perPhase) {
    if (bucket.total < minDays) continue;
    for (const [symptom, days] of bucket.counts) {
      const pct = Math.round((days / bucket.total) * 100);
      if (pct >= 40) out.push({ symptom, pct, days, phase });
    }
  }
  return out.sort((a, b) => b.pct - a.pct).slice(0, 6);
}

/** Her recent cycle lengths, newest last - for the regularity chart. */
export function cycleLengths(logs: LogRow[], max = 6): { start: string; length: number }[] {
  const starts = periodStarts(logs);
  const out: { start: string; length: number }[] = [];
  for (let i = 1; i < starts.length; i++) {
    const length = daysBetween(starts[i - 1], starts[i]);
    if (length >= 15 && length <= 60) out.push({ start: starts[i - 1], length });
  }
  return out.slice(-max);
}

/** The four phases, in cycle order - the shape the guidance editor works from. */
export const GUIDANCE_PHASES: Phase[] = ["menstrual", "follicular", "ovulation", "luteal"];
