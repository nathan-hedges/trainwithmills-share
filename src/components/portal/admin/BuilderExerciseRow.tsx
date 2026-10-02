"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { GuideImage } from "../GuideImage";
import { Badge } from "../primitives";
import { cn } from "@/lib/utils";
import { clockToSeconds, isCardioCategory, secondsToClock } from "@/lib/duration";
import { TrendingUp } from "lucide-react";
import type { BuilderExercise, ExerciseHistory } from "./WorkoutBuilder";

const numCls =
  "h-9 w-full rounded-lg border border-line bg-paper px-2 text-center text-sm tabular-nums transition-colors focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15";
const txtCls =
  "h-9 w-full rounded-lg border border-line bg-paper px-3 text-sm transition-colors placeholder:text-muted/60 focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15";

/** One set: strength (reps + RPE) OR a cardio interval (work/rest seconds + pace). */
export interface SetInput {
  targetReps: number;
  targetRpe: string | null;
  workSeconds: number | null;
  restSeconds: number | null;
  pace: string | null;
}

type SetRow = { reps: string; rpe: string; work: string; rest: string; pace: string };

const toRow = (s: {
  targetReps: number;
  targetRpe: string | null;
  workSeconds?: number | null;
  restSeconds?: number | null;
  pace?: string | null;
}): SetRow => ({
  reps: String(s.targetReps),
  rpe: s.targetRpe ?? "",
  work: secondsToClock(s.workSeconds),
  rest: secondsToClock(s.restSeconds),
  pace: s.pace ?? "",
});

/**
 * One placed exercise in the coach's builder. Sets are edited individually.
 * Strength exercises show Reps + RPE; cardio exercises (category "Cardio") show
 * per-interval Work / Rest / Pace instead. Saving happens on blur and on
 * add/remove via the onSets callback.
 */
export function BuilderExerciseRow({
  assigned,
  history,
  onSets,
  onNote,
  onRemove,
}: {
  assigned: BuilderExercise;
  history?: ExerciseHistory;
  onSets: (sets: SetInput[]) => void;
  onNote: (note: string) => void;
  onRemove: () => void;
}) {
  const ex = assigned.exercise;
  const cardio = isCardioCategory(ex.category);
  const blank: SetRow = cardio
    ? { reps: "0", rpe: "", work: "0:30", rest: "0:30", pace: "" }
    : { reps: "10", rpe: "", work: "", rest: "", pace: "" };

  const [sets, setSets] = useState<SetRow[]>(() =>
    (assigned.sets.length ? assigned.sets : [{ targetReps: 10, targetRpe: null }]).map(toRow),
  );
  const [note, setNote] = useState(assigned.note ?? "");

  function persist(rows: SetRow[]) {
    onSets(
      rows.map((s) =>
        cardio
          ? {
              targetReps: 0,
              targetRpe: null,
              workSeconds: clockToSeconds(s.work),
              restSeconds: clockToSeconds(s.rest),
              pace: s.pace.trim() || null,
            }
          : {
              targetReps: Math.max(1, Number(s.reps) || 1),
              targetRpe: s.rpe.trim() || null,
              workSeconds: null,
              restSeconds: null,
              pace: null,
            },
      ),
    );
  }
  function update(i: number, patch: Partial<SetRow>) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addSet() {
    const last = sets[sets.length - 1] ?? blank;
    const next = [...sets, { ...last }];
    setSets(next);
    persist(next);
  }
  function removeSet(i: number) {
    if (sets.length <= 1) return;
    const next = sets.filter((_, idx) => idx !== i);
    setSets(next);
    persist(next);
  }

  const cols = cardio ? "grid-cols-[2rem_1fr_1fr_1fr_2rem]" : "grid-cols-[2rem_1fr_1fr_2rem]";

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-soft">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line">
          <GuideImage src={ex.guideImageUrl} name={ex.name} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-ink">{ex.name}</h4>
            <Badge tone="royal">{ex.category}</Badge>
            {assigned.optedOut && <Badge tone="amber">Client opted out</Badge>}
          </div>
          {assigned.optedOut && assigned.optOutNote ? (
            <p className="mt-0.5 truncate text-xs italic text-amber-700">&ldquo;{assigned.optOutNote}&rdquo;</p>
          ) : (
            ex.cue && <p className="mt-0.5 truncate text-xs text-muted">{ex.cue}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${ex.name}`}
          className="text-muted transition-colors hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Progressive-overload hint: what they last logged + a suggested next load. */}
      {!cardio && history && history.topWeight > 0 && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-royal-50/70 px-2.5 py-1 text-xs text-royal-800">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          <span>
            Last: <strong>{history.topWeight}kg × {history.topReps}</strong>
            {history.allDone && (
              <>
                {" "}
                · ready for <strong>~{history.suggestion}kg</strong>
              </>
            )}
          </span>
        </div>
      )}

      {/* Per-set / per-interval prescription */}
      <div className="mt-3">
        <div className={cn("grid items-center gap-2 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted", cols)}>
          <span>{cardio ? "Int" : "Set"}</span>
          {cardio ? (
            <>
              <span>Work</span>
              <span>Rest</span>
              <span>Pace</span>
            </>
          ) : (
            <>
              <span>Reps</span>
              <span>RPE</span>
            </>
          )}
          <span />
        </div>
        <div className="space-y-1.5">
          {sets.map((s, i) => (
            <div key={i} className={cn("grid items-center gap-2", cols)}>
              <span className="text-center text-sm font-semibold text-muted">{i + 1}</span>
              {cardio ? (
                <>
                  <input
                    type="text"
                    value={s.work}
                    placeholder="0:30"
                    onChange={(e) => update(i, { work: e.target.value })}
                    onBlur={() => persist(sets)}
                    className={numCls}
                  />
                  <input
                    type="text"
                    value={s.rest}
                    placeholder="0:30"
                    onChange={(e) => update(i, { rest: e.target.value })}
                    onBlur={() => persist(sets)}
                    className={numCls}
                  />
                  <input
                    type="text"
                    value={s.pace}
                    placeholder="9 km/h"
                    onChange={(e) => update(i, { pace: e.target.value })}
                    onBlur={() => persist(sets)}
                    className={numCls}
                  />
                </>
              ) : (
                <>
                  <input
                    type="number"
                    min={1}
                    value={s.reps}
                    onChange={(e) => update(i, { reps: e.target.value })}
                    onBlur={() => persist(sets)}
                    className={numCls}
                  />
                  <input
                    type="text"
                    value={s.rpe}
                    placeholder="7-8"
                    onChange={(e) => update(i, { rpe: e.target.value })}
                    onBlur={() => persist(sets)}
                    className={numCls}
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => removeSet(i)}
                disabled={sets.length <= 1}
                aria-label={`Remove ${cardio ? "interval" : "set"} ${i + 1}`}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:text-red-500 disabled:opacity-30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSet}
          className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-royal-300 px-3 py-1.5 text-xs font-semibold text-royal-700 transition-colors hover:bg-royal-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add {cardio ? "interval" : "set"}
        </button>
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => onNote(note)}
        placeholder="Add a coaching note for this exercise…"
        aria-label={`${ex.name} coaching note`}
        className={`${txtCls} mt-3`}
      />
    </div>
  );
}
