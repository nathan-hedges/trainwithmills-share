/**
 * Tier + habit configuration and small pure helpers for the Nutrition area.
 * (Real data now comes from the API -see lib/nutrition/types.ts + the routes.)
 */

export type Tier = "student" | "beginner" | "performance";

export interface TierInfo {
  id: Tier;
  name: string;
  /** Who controls the habit goals. */
  habitControl: "client" | "shared" | "coach";
  habitControlLabel: string;
  /** How deep the meal-idea content goes. */
  mealDepth: "basic" | "educational" | "tailored";
  /** How rich the progress tracking is. */
  analytics: "basic" | "trends" | "advanced";
}

export const TIERS: TierInfo[] = [
  {
    id: "student",
    name: "Student",
    habitControl: "client",
    habitControlLabel: "You set your own goals",
    mealDepth: "basic",
    analytics: "basic",
  },
  {
    id: "beginner",
    name: "Beginner",
    habitControl: "shared",
    habitControlLabel: "You and I set goals together",
    mealDepth: "educational",
    analytics: "trends",
  },
  {
    id: "performance",
    name: "Performance",
    habitControl: "shared",
    habitControlLabel: "You and I set your goals",
    mealDepth: "tailored",
    analytics: "advanced",
  },
];

export const tierInfo = (t: Tier) => TIERS.find((x) => x.id === t)!;

// ── Protein calculator ──────────────────────────────────────────────
// goal = bodyweight (kg) × a coach-set multiplier (g/kg). Simple and direct.

export function proteinGoal(weightKg: number, multiplier: number): number {
  return Math.round(weightKg * multiplier);
}

// ── Habit metadata ──────────────────────────────────────────────────
// Static config (labels, units, step size, colour, the "why"). The actual
// value/goal numbers come from the API.

export type HabitId = "steps" | "sleep" | "water" | "fiveADay";

export interface Habit {
  id: HabitId;
  label: string;
  unit: string;
  step: number;
  /** Tailwind colour key used for the progress fill. */
  color: "royal" | "violet" | "sky" | "emerald";
  why: string;
}

export const defaultHabits: Habit[] = [
  {
    id: "steps",
    label: "Steps",
    unit: "",
    step: 500,
    color: "royal",
    why: "Daily steps drive the bulk of your non-exercise calorie burn and support recovery, mood and heart health.",
  },
  {
    id: "sleep",
    label: "Sleep",
    unit: "h",
    step: 0.5,
    color: "violet",
    why: "Sleep is when you recover and adapt. Under-sleeping blunts strength gains, raises hunger hormones and lowers training quality.",
  },
  {
    id: "water",
    label: "Water",
    unit: "L",
    step: 0.25,
    color: "sky",
    why: "Even mild dehydration reduces strength and focus. Aim to sip consistently through the day, more around training.",
  },
  {
    id: "fiveADay",
    label: "5-a-day",
    unit: "",
    step: 1,
    color: "emerald",
    why: "Fruit & veg give you fibre, vitamins and minerals that protein and carbs don't - key for digestion, energy and immunity.",
  },
];

export const HABIT_META: { id: HabitId; label: string }[] = [
  { id: "steps", label: "Steps" },
  { id: "sleep", label: "Sleep" },
  { id: "water", label: "Water" },
  { id: "fiveADay", label: "5-a-day" },
];

/** Colour for a 0–100 compliance/percentage value. */
export function complianceTone(pct: number): { bar: string; text: string } {
  if (pct >= 80) return { bar: "bg-emerald-500", text: "text-emerald-700" };
  if (pct >= 55) return { bar: "bg-gold-500", text: "text-gold-600" };
  return { bar: "bg-amber-500", text: "text-amber-600" };
}
