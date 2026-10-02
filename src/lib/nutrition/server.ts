import { prisma } from "@/lib/prisma";
import { tierInfo, type Tier } from "./config";

// "Today" as a YYYY-MM-DD string -same convention as Workout.date.
// This is UTC; "today" rolls over at midnight UTC, matching the cron + workouts.
export function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Which day a nutrition log is for. Missing → today. Otherwise it must be a
 * YYYY-MM-DD date that's today or earlier, at most 14 days back (backfilling
 * a forgotten day is fine; logging the future or ancient history is not).
 * Returns null when invalid.
 */
export function resolveLogDate(input: unknown): string | null {
  if (input == null || input === "") return todayKey();
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const today = todayKey();
  if (input > today) return null;
  const daysBack = Math.round(
    (new Date(`${today}T00:00:00Z`).getTime() - new Date(`${input}T00:00:00Z`).getTime()) / 86_400_000,
  );
  if (Number.isNaN(daysBack) || daysBack > 14) return null;
  return input;
}

// The profile may not exist yet (older users, or a brand-new client).
// Upsert-on-read guarantees there's always a row to work with.
export function ensureProfile(userId: string) {
  return prisma.nutritionProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

// goal = bodyweight (kg) × multiplier (g/kg), rounded. No weight yet → no goal.
export function proteinGoal(weightKg: number | null, multiplier: number): number | null {
  if (!weightKg) return null;
  return Math.round(weightKg * multiplier);
}

// A client may edit their own goals unless the tier is fully coach-controlled.
// (All current tiers allow it -Performance is now "shared".)
export function clientCanEditGoals(tier: string): boolean {
  return tierInfo(tier as Tier).habitControl !== "coach";
}

// Coerce + clamp an incoming numeric value. Integer fields get rounded so we
// never try to write 7240.5 into an Int column.
const INT_KEYS = new Set([
  "protein", "steps", "fiveADay", // log fields
  "stepsGoal", "fiveADayGoal", // goal fields
]);
export function clampNum(key: string, v: unknown): number {
  const n = Math.max(0, Number(v) || 0);
  return INT_KEYS.has(key) ? Math.round(n) : n;
}

// ── Meals ────────────────────────────────────────────────────────────
export const MEAL_CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

// Sanitise an incoming meal payload from the coach into a safe DB shape.
export function cleanMeal(body: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const num = (v: unknown) => Math.max(0, Number(v) || 0);
  const category = (MEAL_CATEGORIES as readonly string[]).includes(str(body.category))
    ? str(body.category)
    : "Lunch";
  const recipe = Array.isArray(body.recipe)
    ? body.recipe.map((s) => String(s).trim()).filter(Boolean)
    : [];
  return {
    name: str(body.name).trim(),
    category,
    description: str(body.description),
    recipe,
    price: num(body.price),
    protein: Math.round(num(body.protein)),
    carbs: Math.round(num(body.carbs)),
    fat: Math.round(num(body.fat)),
    calories: Math.round(num(body.calories)),
    budget: Boolean(body.budget),
    education: str(body.education).trim() || null,
    coachNote: str(body.coachNote).trim() || null,
  };
}
