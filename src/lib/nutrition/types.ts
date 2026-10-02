import type { Tier } from "./config";

// Shapes the nutrition API returns to the client (safe to import in components).

export interface NutritionProfileDTO {
  bodyWeightKg: number | null;
  proteinMultiplier: number;
  stepsGoal: number;
  sleepGoal: number;
  waterGoal: number;
  fiveADayGoal: number;
  proteinGoal: number | null; // derived server-side
}

export interface NutritionLogDTO {
  protein: number;
  steps: number;
  sleep: number;
  water: number;
  fiveADay: number;
}

export interface NutritionData {
  tier: Tier | null; // null = the client has no active plan
  profile: NutritionProfileDTO;
  today: NutritionLogDTO; // the requested day's log (name kept for the existing UI)
  date?: string; // which day `today` refers to (YYYY-MM-DD)
}

// ── Meals ────────────────────────────────────────────────────────────
export type MealCategory = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export interface Meal {
  id: string;
  name: string;
  category: MealCategory;
  description: string;
  recipe: string[];
  price: number;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  budget: boolean;
  education: string | null;
  coachNote: string | null;
}

// ── Insights / analytics ─────────────────────────────────────────────
export interface MetricStat {
  pct: number; // % of logged days this week that hit the goal
  deltaVsLastWeek: number; // percentage-point change vs last week
}

export interface NutritionAnalytics {
  daysLogged: number; // this week
  proteinHitDays: number;
  avgSteps: number;
  avgSleep: number;
  protein: MetricStat;
  steps: MetricStat;
  sleep: MetricStat;
  water: MetricStat;
  fiveADay: MetricStat;
  suggestions: string[]; // data-driven insight strings the coach can insert
}

export interface InsightNote {
  id: string;
  text: string;
  createdAt: string;
}

// Client's own insights view.
export interface ClientInsights {
  tier: Tier | null;
  analytics: NutritionAnalytics;
  notes: InsightNote[]; // coach-authored (Performance tier)
}

// Coach view of one client's insights (adds editable suggestions + notes).
export interface CoachInsights {
  analytics: NutritionAnalytics;
  notes: InsightNote[];
}

// Goals as plain numbers (protein derived from weight × multiplier).
export interface GoalSet {
  protein: number;
  steps: number;
  sleep: number;
  water: number;
  fiveADay: number;
}

export interface DailyLog {
  id: string;
  date: string;
  protein: number;
  steps: number;
  sleep: number;
  water: number;
  fiveADay: number;
}

// Coach view of a client's recently logged nutrition + habits.
export interface NutritionLogsDTO {
  goals: GoalSet;
  logs: DailyLog[];
}

// One row in the coach all-client overview.
export interface NutritionOverviewRow {
  id: string;
  name: string;
  initials: string;
  tier: Tier;
  proteinGoal: number | null;
  proteinCompliance: number;
  habits: { steps: number; sleep: number; water: number; fiveADay: number };
  trend: "up" | "down" | "flat";
}
