"use client";

import { useState } from "react";
import { Ban, Check, ChevronDown, Info, TrendingUp, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isCardioCategory, secondsToClock } from "@/lib/duration";
import { Card, Badge } from "../primitives";
import { GuideImage } from "../GuideImage";
import { ProgressionChart } from "./ProgressionChart";

const inputCls =
  "h-9 w-full rounded-lg border border-line bg-paper px-2 text-center text-sm tabular-nums text-ink transition-colors focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15 disabled:opacity-60";

export interface CardSet {
  id: string;
  targetReps: number;
  targetRpe: string | null;
  workSeconds: number | null;
  restSeconds: number | null;
  pace: string | null;
  loggedReps: number | null;
  loggedWeight: number | null;
  loggedDistance: number | null;
  loggedPace: string | null;
  completed: boolean;
}
export interface CardExercise {
  id: string;
  /** The library exercise id (WorkoutExercise.exerciseId) - used for progression lookup. */
  exerciseId: string;
  groupId: string | null;
  groupType: string | null;
  prescription: string;
  note: string | null;
  optedOut: boolean;
  optOutNote: string | null;
  exercise: { name: string; category: string; cue: string | null; guideImageUrl: string | null };
  sets: CardSet[];
}
export interface ChartPoint {
  date: string;
  weight: number;
}
export type SetPatch = {
  loggedWeight?: number | null;
  loggedReps?: number | null;
  loggedDistance?: number | null;
  loggedPace?: string | null;
  completed?: boolean;
};

/** "0:30 on / 0:30 off @ 9 km/h" for a cardio interval. */
function cardioTarget(set: CardSet): string {
  const parts: string[] = [];
  if (set.workSeconds) parts.push(`${secondsToClock(set.workSeconds)} on`);
  if (set.restSeconds) parts.push(`${secondsToClock(set.restSeconds)} off`);
  const base = parts.join(" / ") || "Interval";
  return set.pace ? `${base} @ ${set.pace}` : base;
}

function SetRow({
  index,
  set,
  cardio,
  readOnly,
  lastTime,
  onLog,
}: {
  index: number;
  set: CardSet;
  cardio: boolean;
  readOnly?: boolean;
  /** This client's last logged top set for this exercise (prefill + hint). */
  lastTime?: { topWeight: number; topReps: number };
  onLog: (patch: SetPatch) => void;
}) {
  const target = cardio
    ? cardioTarget(set)
    : set.targetRpe
      ? `${set.targetReps} reps @ RPE ${set.targetRpe}`
      : `${set.targetReps} reps`;

  // Suggested numbers from last time (strength only).
  const prefillWeight = !cardio && lastTime?.topWeight ? lastTime.topWeight : null;
  const prefillReps = !cardio && lastTime?.topReps ? lastTime.topReps : null;

  /** Ticking an untouched set records the suggestion rather than blanks. */
  function toggleComplete() {
    if (set.completed) {
      onLog({ completed: false });
      return;
    }
    const patch: SetPatch = { completed: true };
    if (set.loggedWeight == null && prefillWeight != null) patch.loggedWeight = prefillWeight;
    if (set.loggedReps == null) patch.loggedReps = prefillReps ?? set.targetReps;
    onLog(patch);
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[1.75rem_1fr_1fr_1fr_2.5rem] items-center gap-2 rounded-xl border px-1.5 py-1.5 transition-colors",
        set.completed ? "border-emerald-200 bg-emerald-50/60" : "border-transparent",
      )}
    >
      <span className="text-center text-sm font-semibold text-muted">{index}</span>
      {/* No truncate: target strings like "12 reps @ RPE 7-8" must stay readable on phones. */}
      <span className="text-xs leading-snug text-muted sm:text-sm">{target}</span>
      {cardio ? (
        <>
          <input
            type="number"
            inputMode="decimal"
            aria-label={`Interval ${index} distance`}
            disabled={readOnly}
            value={set.loggedDistance ?? ""}
            placeholder=" -"
            onChange={(e) => onLog({ loggedDistance: e.target.value === "" ? null : Number(e.target.value) })}
            className={inputCls}
          />
          <input
            type="text"
            aria-label={`Interval ${index} pace`}
            disabled={readOnly}
            value={set.loggedPace ?? ""}
            placeholder={set.pace ?? " -"}
            onChange={(e) => onLog({ loggedPace: e.target.value === "" ? null : e.target.value })}
            className={inputCls}
          />
        </>
      ) : (
        <>
          {/* Last session's numbers show as placeholders and are committed if
              she ticks the set without typing - repeat weeks take one tap. */}
          <input
            type="number"
            inputMode="decimal"
            aria-label={`Set ${index} weight`}
            disabled={readOnly}
            value={set.loggedWeight ?? ""}
            placeholder={prefillWeight != null ? String(prefillWeight) : " -"}
            onChange={(e) => onLog({ loggedWeight: e.target.value === "" ? null : Number(e.target.value) })}
            className={inputCls}
          />
          <input
            type="number"
            inputMode="numeric"
            aria-label={`Set ${index} reps`}
            disabled={readOnly}
            value={set.loggedReps ?? ""}
            placeholder={String(prefillReps ?? set.targetReps)}
            onChange={(e) => onLog({ loggedReps: e.target.value === "" ? null : Number(e.target.value) })}
            className={inputCls}
          />
        </>
      )}
      <button
        type="button"
        disabled={readOnly}
        onClick={toggleComplete}
        aria-label={set.completed ? `Mark ${index} incomplete` : `Mark ${index} complete`}
        aria-pressed={set.completed}
        className={cn(
          // Full-column tap target: this gets tapped mid-set, on a phone, with
          // gym hands - a small tick is the wrong thing to aim at.
          "mx-auto grid h-10 w-10 cursor-pointer place-items-center rounded-lg border transition-colors disabled:cursor-default",
          set.completed
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-line text-transparent hover:border-royal-400 hover:text-royal-300",
        )}
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ExerciseCard({
  assigned,
  unit,
  progress = [],
  readOnly,
  lastTime,
  onLog,
  onOptOut,
}: {
  assigned: CardExercise;
  unit: string;
  progress?: ChartPoint[];
  readOnly?: boolean;
  /** Last logged top set for this exercise - prefills the rows. */
  lastTime?: { date: string; topWeight: number; topReps: number };
  onLog: (setId: string, patch: SetPatch) => void;
  /** Client opts out of (or back into) this exercise, with an optional note. */
  onOptOut?: (optedOut: boolean, note?: string) => void;
}) {
  const [showChart, setShowChart] = useState(false);
  const [optingOut, setOptingOut] = useState(false);
  const [optNote, setOptNote] = useState("");
  const ex = assigned.exercise;
  const cardio = isCardioCategory(ex.category);
  const optedOut = assigned.optedOut;

  const done = assigned.sets.filter((s) => s.completed).length;
  const total = assigned.sets.length;
  const allDone = done === total && total > 0;

  const start = progress[0]?.weight;
  const current = progress[progress.length - 1]?.weight;
  const delta = start != null && current != null ? Math.round((current - start) * 10) / 10 : null;

  return (
    <Card className={cn("overflow-hidden", allDone && "ring-1 ring-emerald-200")}>
      <div className="flex gap-4 p-4 sm:p-5">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line sm:h-20 sm:w-20">
          <GuideImage src={ex.guideImageUrl ?? undefined} name={ex.name} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg leading-tight">{ex.name}</h3>
                <Badge tone="royal">{ex.category}</Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted">{assigned.prescription}</p>
              {!cardio && lastTime && lastTime.topWeight > 0 && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-royal-700">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Last time: {lastTime.topWeight}
                  {unit} × {lastTime.topReps}
                </p>
              )}
            </div>
            {optedOut ? (
              <Badge tone="amber">Opted out</Badge>
            ) : (
              <Badge tone={allDone ? "green" : "neutral"}>
                {done}/{total} {cardio ? "done" : "sets"}
              </Badge>
            )}
          </div>
          {ex.cue && (
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-royal-400" />
              {ex.cue}
            </p>
          )}
        </div>
      </div>

      {assigned.note && (
        <div className="mx-4 mb-3 rounded-xl bg-royal-50 px-3 py-2 text-sm text-royal-800 sm:mx-5">
          <span className="font-semibold">Coach note:</span> {assigned.note}
        </div>
      )}

      {optedOut && (
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <div className="flex min-w-0 items-start gap-2 text-sm text-amber-800">
              <Ban className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                You opted out of this exercise.
                {assigned.optOutNote && (
                  <>
                    {" "}
                    <span className="font-medium">&ldquo;{assigned.optOutNote}&rdquo;</span>
                  </>
                )}
              </span>
            </div>
            {!readOnly && onOptOut && (
              <button
                type="button"
                onClick={() => onOptOut(false)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo
              </button>
            )}
          </div>
        </div>
      )}

      {!optedOut && (
      <div className="border-t border-line px-4 py-3 sm:px-5">
        <div className="grid grid-cols-[1.75rem_1fr_1fr_1fr_2.5rem] items-center gap-2 px-1.5 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <span className="text-center">#</span>
          <span>Target</span>
          {cardio ? (
            <>
              <span>Dist</span>
              <span>Pace</span>
            </>
          ) : (
            <>
              <span>Weight ({unit})</span>
              <span>Reps</span>
            </>
          )}
          <span className="text-center">Done</span>
        </div>
        <div className="space-y-1.5">
          {assigned.sets.map((set, i) => (
            <SetRow
              key={set.id}
              index={i + 1}
              set={set}
              cardio={cardio}
              readOnly={readOnly}
              lastTime={lastTime}
              onLog={(patch) => onLog(set.id, patch)}
            />
          ))}
        </div>

        {/* Opt out - "I can't / won't do this one today", with a note for the coach. */}
        {!readOnly && onOptOut && (
          <div className="mt-3">
            {optingOut ? (
              <div className="space-y-2 rounded-xl border border-line bg-paper p-3">
                <input
                  autoFocus
                  value={optNote}
                  onChange={(e) => setOptNote(e.target.value)}
                  placeholder="Why? (optional) - e.g. knee pain, no kit available"
                  className="h-9 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-muted/60 focus:border-royal-400 focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOptingOut(false);
                      setOptNote("");
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOptOut(true, optNote.trim() || undefined);
                      setOptingOut(false);
                      setOptNote("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Opt out
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setOptingOut(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
              >
                <Ban className="h-3.5 w-3.5" />
                Opt out of this exercise
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {!cardio && !optedOut && (
        <div className="border-t border-line">
          <button
            type="button"
            onClick={() => setShowChart((v) => !v)}
            className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-royal-700 transition-colors hover:bg-royal-50/50 sm:px-5"
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Strength progression
            </span>
            <span className="flex items-center gap-2">
              {delta != null && (
                <span className={cn("text-xs font-semibold", delta >= 0 ? "text-emerald-600" : "text-amber-600")}>
                  {delta >= 0 ? "+" : ""}
                  {delta} {unit}
                </span>
              )}
              <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", showChart && "rotate-180")} />
            </span>
          </button>
          {showChart && (
            <div className="px-4 pb-4 sm:px-5">
              {progress.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">
                  No history yet - log a few sessions and your progress will show here.
                </p>
              ) : (
                <>
                  <div className="mb-3 flex gap-5 text-sm">
                    <div>
                      <span className="text-muted">Start </span>
                      <span className="font-semibold">{start ?? " -"} {unit}</span>
                    </div>
                    <div>
                      <span className="text-muted">Current </span>
                      <span className="font-semibold text-royal-700">{current ?? " -"} {unit}</span>
                    </div>
                  </div>
                  <ProgressionChart data={progress} unit={unit} />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
