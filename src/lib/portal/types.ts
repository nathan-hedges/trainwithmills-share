/**
 * Shared portal types + tiny name helpers. Everything else the portal shows
 * comes typed from the API routes (Prisma models) - the old mock-era types
 * that used to live here have been removed.
 */

export type ID = string;
export type Role = "coach" | "client";

export type ExerciseCategory =
  | "Lower"
  | "Upper"
  | "Core"
  | "Cardio"
  | "Conditioning";

/** An exercise in the coach's reusable library. */
export interface ExerciseDef {
  id: ID;
  name: string;
  category: ExerciseCategory;
  /** Coaching cue shown to the client. */
  cue?: string;
  /** YouTube guide link - empty = placeholder graphic. */
  guideImageUrl?: string;
}

/** One week of completed-vs-planned sessions, for the coach consistency chart. */
export interface WeeklyStat {
  weekLabel: string;
  completed: number;
  planned: number;
  /** Total training volume that week, in tonnes. */
  volume: number;
}

/** A person's display name from their first + last name (null-safe). */
export function fullName(p: { firstName?: string | null; lastName?: string | null }): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Unnamed";
}

/** Two-letter initials from a first + last name. */
export function initialsOf(p: { firstName?: string | null; lastName?: string | null }): string {
  return ((p.firstName?.[0] ?? "") + (p.lastName?.[0] ?? "")).toUpperCase() || "?";
}

/** Whole years from a date of birth. Null when we don't have one. */
export function ageFrom(dob: string | Date | null | undefined): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}
