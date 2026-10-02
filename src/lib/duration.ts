/**
 * Helpers for cardio interval durations. Durations are stored as a number of
 * seconds in the DB, but entered/displayed as "m:ss" (e.g. 90 → "1:30").
 */

/** Seconds → "m:ss". null/0 → "". */
export function secondsToClock(s: number | null | undefined): string {
  if (s == null || s <= 0) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** "1:30" → 90, "45" → 45, blank/invalid → null. */
export function clockToSeconds(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  if (t.includes(":")) {
    const [m, s] = t.split(":");
    const secs = (Number(m) || 0) * 60 + (Number(s) || 0);
    return secs > 0 ? secs : null;
  }
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** A library exercise is cardio when its category is "Cardio" (case-insensitive). */
export const isCardioCategory = (category?: string | null) => (category ?? "").toLowerCase() === "cardio";
