/**
 * Normalising prescribed set rows + building the human "prescription" label.
 * A set row is either a strength set (reps + RPE) or a cardio interval
 * (work/rest seconds + pace). This is the single source of truth shared by the
 * live workout sets route, template save, apply, and from-week capture.
 */
import { secondsToClock } from "./duration";

export interface RawSetInput {
  targetReps?: number | string | null;
  targetRpe?: string | null;
  workSeconds?: number | null;
  restSeconds?: number | null;
  pace?: string | null;
}

export interface CleanSet {
  targetReps: number;
  targetRpe: string | null;
  workSeconds: number | null;
  restSeconds: number | null;
  pace: string | null;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const posInt = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

const rowIsCardio = (s: { workSeconds: number | null; restSeconds: number | null; pace: string | null }) =>
  s.workSeconds != null || s.restSeconds != null || s.pace != null;

/** Normalise a list of incoming set rows (strength or cardio). */
export function cleanSets(incoming: RawSetInput[]): CleanSet[] {
  return incoming.map((s) => {
    const workSeconds = posInt(s.workSeconds);
    const restSeconds = posInt(s.restSeconds);
    const pace = str(s.pace);
    const cardio = workSeconds != null || restSeconds != null || pace != null;
    return {
      // strength: reps default to 1; cardio: reps unused, stored as 0
      targetReps: cardio ? 0 : Math.max(1, Number(s.targetReps) || 1),
      targetRpe: cardio ? null : str(s.targetRpe),
      workSeconds,
      restSeconds,
      pace,
    };
  });
}

/** The label stored on the exercise: "3 × 10", "12/10/8", or "6 × 0:30 on / 0:30 off". */
export function setPrescription(sets: CleanSet[]): string {
  if (sets.length === 0) return "";
  if (sets.some(rowIsCardio)) {
    const { workSeconds: w, restSeconds: r } = sets[0];
    const uniform = sets.every((s) => s.workSeconds === w && s.restSeconds === r);
    if (uniform && (w || r)) {
      const on = w ? `${secondsToClock(w)} on` : "";
      const off = r ? `${secondsToClock(r)} off` : "";
      return `${sets.length} × ${[on, off].filter(Boolean).join(" / ")}`;
    }
    return `${sets.length} intervals`;
  }
  const reps = sets.map((s) => s.targetReps);
  const uniform = reps.every((x) => x === reps[0]);
  return uniform ? `${sets.length} × ${reps[0]}` : reps.join("/");
}
