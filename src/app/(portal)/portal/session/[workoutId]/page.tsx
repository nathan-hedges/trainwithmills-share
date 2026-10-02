"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Ban,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  MessageSquareQuote,
  PartyPopper,
  TrendingUp,
  Trophy,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { celebrate } from "@/lib/celebrate";
import { isCardioCategory, secondsToClock } from "@/lib/duration";
import { Badge, Card } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import { GuideImage } from "@/components/portal/GuideImage";
import { CheckInCard, type CheckInData } from "@/components/portal/client/CheckInCard";
import { PreWorkoutCheckIn, type PreCheckIn } from "@/components/portal/client/PreWorkoutCheckIn";
import { SpotifyPanel } from "@/components/portal/client/SpotifyPanel";

// ── shapes (same data as /api/me/workouts/[id]) ─────────────────────
interface SSet {
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
interface SExercise {
  id: string;
  exerciseId: string;
  groupId: string | null;
  groupType: string | null;
  prescription: string;
  note: string | null;
  optedOut: boolean;
  optOutNote: string | null;
  exercise: { name: string; category: string; cue: string | null; guideImageUrl: string | null };
  sets: SSet[];
}
interface SWorkout {
  id: string;
  date: string;
  title: string;
  focus: string;
  status: string;
  warmup: string | null;
  // The stored row carries both halves; CheckInData is only the 'after' part.
  checkIn: (CheckInData & { energyBefore: number | null }) | null;
  exercises: SExercise[];
}
type History = Record<string, { date: string; topWeight: number; topReps: number }>;
type Block = { groupId: string | null; groupType: string | null; items: SExercise[] };
type PR = { name: string; weight: number };

/** Group same-groupId exercises into blocks (one block = one screen). */
function groupBlocks(exercises: SExercise[]): Block[] {
  const blocks: Block[] = [];
  const seen = new Set<string>();
  for (const ex of exercises) {
    if (!ex.groupId) blocks.push({ groupId: null, groupType: null, items: [ex] });
    else if (!seen.has(ex.groupId)) {
      seen.add(ex.groupId);
      blocks.push({ groupId: ex.groupId, groupType: ex.groupType, items: exercises.filter((e) => e.groupId === ex.groupId) });
    }
  }
  return blocks;
}

function cardioTarget(set: SSet): string {
  const parts: string[] = [];
  if (set.workSeconds) parts.push(`${secondsToClock(set.workSeconds)} on`);
  if (set.restSeconds) parts.push(`${secondsToClock(set.restSeconds)} off`);
  const base = parts.join(" / ") || "Interval";
  return set.pace ? `${base} @ ${set.pace}` : base;
}
function strengthTarget(set: SSet): string {
  return set.targetRpe ? `${set.targetReps} reps @ RPE ${set.targetRpe}` : `${set.targetReps} reps`;
}

/** A block is "done" when every exercise is opted out or fully ticked. */
function blockState(b: Block): "done" | "partial" | "todo" {
  const active = b.items.filter((e) => !e.optedOut);
  if (active.length === 0) return "done";
  const total = active.reduce((n, e) => n + e.sets.length, 0);
  const done = active.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0);
  if (total > 0 && done === total) return "done";
  return done > 0 ? "partial" : "todo";
}

const numInput =
  "h-11 w-full min-w-0 rounded-lg border border-line bg-white text-center text-base font-semibold tabular-nums text-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:border-royal-400 focus:outline-none focus:ring-2 focus:ring-royal-500/15 disabled:bg-paper disabled:text-muted";

// ── compact one-line stepper: [−][ 100 ][+] ─────────────────────────
function Stepper({
  value,
  step,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const bump = (dir: 1 | -1) => onChange(Math.max(0, Math.round((value + dir * step) * 100) / 100));
  const btn =
    "grid h-11 w-9 shrink-0 place-items-center rounded-lg border border-line bg-paper text-lg font-semibold text-muted transition-colors active:bg-royal-50 active:text-royal-700 disabled:opacity-40";
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <button type="button" onClick={() => bump(-1)} disabled={disabled} aria-label={`Decrease ${ariaLabel}`} className={btn}>
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={value === 0 ? "" : value}
        placeholder="0"
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className={numInput}
      />
      <button type="button" onClick={() => bump(1)} disabled={disabled} aria-label={`Increase ${ariaLabel}`} className={btn}>
        +
      </button>
    </div>
  );
}

// ── one set row inside the sets card ────────────────────────────────
function SessionSetRow({
  index,
  set,
  cardio,
  prefillWeight,
  onLog,
}: {
  index: number;
  set: SSet;
  cardio: boolean;
  prefillWeight: number;
  onLog: (patch: Record<string, unknown>) => void;
}) {
  const [weight, setWeight] = useState<number>(set.loggedWeight ?? prefillWeight);
  const [reps, setReps] = useState<number>(set.loggedReps ?? set.targetReps);
  const [distance, setDistance] = useState<number>(set.loggedDistance ?? 0);
  const [pace, setPace] = useState<string>(set.loggedPace ?? "");

  function toggleDone() {
    if (set.completed) {
      onLog({ completed: false });
      return;
    }
    onLog(
      cardio
        ? { completed: true, loggedDistance: distance > 0 ? distance : null, loggedPace: pace.trim() || null }
        : { completed: true, loggedWeight: weight > 0 ? weight : null, loggedReps: reps > 0 ? reps : null },
    );
  }

  return (
    <div className={cn("rounded-xl px-2 py-2 transition-colors", set.completed && "bg-emerald-50/70")}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 px-0.5">
        <span
          className={cn(
            "text-[11px] font-bold uppercase tracking-wide",
            set.completed ? "text-emerald-600" : "text-muted",
          )}
        >
          Set {index}
        </span>
        <span className="text-right text-[11px] leading-snug text-muted">
          {cardio ? cardioTarget(set) : strengthTarget(set)}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3rem] items-center gap-1.5">
        {cardio ? (
          <>
            <input
              type="number"
              inputMode="decimal"
              value={distance === 0 ? "" : distance}
              placeholder="0"
              disabled={set.completed}
              aria-label={`Interval ${index} distance`}
              onChange={(e) => setDistance(Math.max(0, Number(e.target.value) || 0))}
              className={numInput}
            />
            <input
              type="text"
              value={pace}
              placeholder={set.pace ?? "-"}
              disabled={set.completed}
              aria-label={`Interval ${index} pace`}
              onChange={(e) => setPace(e.target.value)}
              className={cn(numInput, "font-medium")}
            />
          </>
        ) : (
          <>
            <Stepper value={weight} step={2.5} onChange={setWeight} disabled={set.completed} ariaLabel={`Set ${index} weight`} />
            <Stepper value={reps} step={1} onChange={setReps} disabled={set.completed} ariaLabel={`Set ${index} reps`} />
          </>
        )}
        <button
          type="button"
          onClick={toggleDone}
          aria-label={set.completed ? `Mark set ${index} incomplete` : `Mark set ${index} complete`}
          aria-pressed={set.completed}
          className={cn(
            "grid h-11 w-12 place-items-center rounded-lg border-2 transition-colors",
            set.completed
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-line bg-white text-line active:border-royal-400 active:text-royal-300",
          )}
        >
          <Check className="h-5 w-5" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

// ── one exercise within the current screen ──────────────────────────
function SessionExercise({
  ex,
  history,
  onLog,
  onOptOut,
}: {
  ex: SExercise;
  history?: { date: string; topWeight: number; topReps: number };
  onLog: (setId: string, patch: Record<string, unknown>) => void;
  onOptOut: (optedOut: boolean, note?: string) => void;
}) {
  const cardio = isCardioCategory(ex.exercise.category);
  const [optingOut, setOptingOut] = useState(false);
  const [optNote, setOptNote] = useState("");

  return (
    <div className="space-y-3">
      {/* Guide video banner */}
      {ex.exercise.guideImageUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-line shadow-soft">
          <GuideImage src={ex.exercise.guideImageUrl} name={ex.exercise.name} />
        </div>
      )}

      {/* Name + meta */}
      <div>
        <h2 className="font-display text-[1.7rem] leading-tight text-ink">{ex.exercise.name}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge tone="royal">{ex.exercise.category}</Badge>
          <span className="text-sm text-muted">{ex.prescription}</span>
          {!cardio && history && history.topWeight > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-royal-700">
              <TrendingUp className="h-3.5 w-3.5" />
              Last {history.topWeight}kg × {history.topReps}
            </span>
          )}
        </div>
      </div>

      {(ex.exercise.cue || ex.note) && (
        <div className="space-y-2">
          {ex.exercise.cue && (
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-royal-400" />
              {ex.exercise.cue}
            </p>
          )}
          {ex.note && (
            <p className="flex items-start gap-2 rounded-xl bg-royal-50 px-3 py-2.5 text-sm leading-relaxed text-royal-800">
              <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-royal-500" />
              <span>{ex.note}</span>
            </p>
          )}
        </div>
      )}

      {ex.optedOut ? (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex min-w-0 items-start gap-2 text-sm text-amber-800">
            <Ban className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Opted out{ex.optOutNote ? <> - &ldquo;{ex.optOutNote}&rdquo;</> : "."}</span>
          </div>
          <button
            type="button"
            onClick={() => onOptOut(false)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </button>
        </div>
      ) : (
        <>
          {/* Sets + column hint */}
          <div>
            <Card className="divide-y divide-line/70 p-1.5">
              {ex.sets.map((s, i) => (
                <SessionSetRow
                  key={s.id}
                  index={i + 1}
                  set={s}
                  cardio={cardio}
                  prefillWeight={history?.topWeight ?? 0}
                  onLog={(patch) => onLog(s.id, patch)}
                />
              ))}
            </Card>
            <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3rem] gap-1.5 px-3.5">
              <span className="text-center text-[10px] font-medium uppercase tracking-wide text-muted/70">
                {cardio ? "Distance" : "Weight kg"}
              </span>
              <span className="text-center text-[10px] font-medium uppercase tracking-wide text-muted/70">
                {cardio ? "Pace" : "Reps"}
              </span>
              <span className="text-center text-[10px] font-medium uppercase tracking-wide text-muted/70">Done</span>
            </div>
          </div>

          {optingOut ? (
            <div className="space-y-2 rounded-2xl border border-line bg-white p-3">
              <input
                autoFocus
                value={optNote}
                onChange={(e) => setOptNote(e.target.value)}
                placeholder="Why? (optional) - e.g. knee pain, no kit"
                className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink placeholder:text-muted/60 focus:border-royal-400 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOptingOut(false);
                    setOptNote("");
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted"
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  <Ban className="h-4 w-4" />
                  Opt out
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOptingOut(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition-colors active:bg-amber-100"
            >
              <Ban className="h-3.5 w-3.5" />
              Opt out of this exercise
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── the page ────────────────────────────────────────────────────────
export default function SessionModePage() {
  const params = useParams<{ workoutId: string }>();
  const router = useRouter();
  const workoutId = params.workoutId;

  const [workout, setWorkout] = useState<SWorkout | null>(null);
  const [history, setHistory] = useState<History>({});
  const [failed, setFailed] = useState(false);
  const [idx, setIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const [overview, setOverview] = useState(false);
  const [prs, setPrs] = useState<PR[]>([]);
  // The "before you start" gate. `null` = still deciding whether to show it.
  const [preDone, setPreDone] = useState<boolean | null>(null);
  const [cycle, setCycle] = useState<{
    tracks: boolean;
    phase: string | null;
    guidance: { phase: string; training: string }[];
  }>({ tracks: false, phase: null, guidance: [] });
  const [spotify, setSpotify] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/me/workouts/${workoutId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((w: SWorkout | null) => {
        if (!active) return;
        if (w) setWorkout(w);
        else setFailed(true);
      })
      .catch(() => active && setFailed(true));
    fetch("/api/me/exercise-history")
      .then((r) => (r.ok ? r.json() : {}))
      .then((h: History) => active && setHistory(h))
      .catch(() => {});
    // Only clients who actually track a cycle get asked about it - and NOT
    // those tracking privately, because this answer is saved on the check-in,
    // which the coach can see. "Millie sees nothing" has to stay true.
    fetch("/api/me/cycle")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            status?: string;
            profile?: { shareLevel?: string };
            prediction?: { phase: string | null };
            guidance?: { phase: string; training: string }[];
          } | null,
        ) => {
          if (active && d?.status === "active" && d.profile?.shareLevel !== "private") {
            setCycle({
              tracks: true,
              phase: d.prediction?.phase ?? null,
              guidance: d.guidance ?? [],
            });
          }
        },
      )
      .catch(() => {});
    fetch("/api/settings/spotify")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { url?: string } | null) => active && setSpotify(d?.url ?? ""))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [workoutId]);

  // Keep the screen awake mid-session (best effort).
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const request = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
        };
        if (nav.wakeLock && document.visibilityState === "visible") lock = await nav.wakeLock.request("screen");
      } catch {
        /* unsupported - fine */
      }
    };
    request();
    const onVis = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [idx, finished]);

  const logSet = useCallback(async (setId: string, patch: Record<string, unknown>) => {
    setWorkout((prev) =>
      !prev
        ? prev
        : {
            ...prev,
            status: prev.status === "assigned" ? "in_progress" : prev.status,
            exercises: prev.exercises.map((e) => ({
              ...e,
              sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
            })),
          },
    );
    const res = await fetch(`/api/sets/${setId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.workoutCompleted) {
        setWorkout((prev) => (prev ? { ...prev, status: "completed" } : prev));
        if (Array.isArray(data.prs) && data.prs.length) setPrs(data.prs);
      }
    }
  }, []);

  const optOut = useCallback(async (exId: string, optedOut: boolean, note?: string) => {
    setWorkout((prev) =>
      !prev
        ? prev
        : {
            ...prev,
            exercises: prev.exercises.map((e) =>
              e.id === exId ? { ...e, optedOut, optOutNote: optedOut ? (note ?? null) : null } : e,
            ),
          },
    );
    const res = await fetch(`/api/workout-exercises/${exId}/opt-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optedOut, note }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.workoutCompleted) {
        setWorkout((prev) => (prev ? { ...prev, status: "completed" } : prev));
        if (Array.isArray(data.prs) && data.prs.length) setPrs(data.prs);
      }
    }
  }, []);

  async function finishSession() {
    if (workout && workout.status !== "completed") {
      try {
        const res = await fetch(`/api/workouts/${workout.id}/complete`, { method: "POST" });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (Array.isArray(data?.prs) && data.prs.length) setPrs(data.prs);
        }
      } catch {
        /* completion is retried next visit - still show the finish screen */
      }
      setWorkout((prev) => (prev ? { ...prev, status: "completed" } : prev));
    }
    setFinished(true);
  }

  // The confetti moment - bigger volley when the session had PBs.
  useEffect(() => {
    if (finished) celebrate(prs.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  async function savePreCheckIn(data: PreCheckIn) {
    if (!workout) return;
    await fetch(`/api/workouts/${workout.id}/check-in`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => {});
    setPreDone(true);
  }

  async function saveCheckIn(data: CheckInData) {
    if (!workout) return;
    await fetch(`/api/workouts/${workout.id}/check-in`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  if (failed) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-paper p-6">
        <Card className="max-w-sm p-8 text-center">
          <p className="text-muted">We couldn&apos;t load this session.</p>
          <Link href="/portal" className="mt-3 inline-block font-semibold text-royal-700">
            Back to Today
          </Link>
        </Card>
      </div>
    );
  }
  if (!workout) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-paper p-6">
        <p className="text-muted">Loading your session…</p>
      </div>
    );
  }

  const blocks = groupBlocks(workout.exercises);
  const activeExercises = workout.exercises.filter((e) => !e.optedOut);

  // Ask "before you start" once per session - skip it if she already answered,
  // or if she's mid-session (came back to finish).
  const needsPre =
    preDone === null && workout.checkIn?.energyBefore == null && workout.status !== "completed";

  if (needsPre) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-paper">
        <div className="mx-auto max-w-md px-5 py-10">
          <button
            type="button"
            onClick={() => setPreDone(true)}
            aria-label="Close"
            className="mb-4 grid h-11 w-11 place-items-center rounded-full text-muted transition-colors hover:bg-white hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>

          {spotify && (
            <div className="mb-6">
              <SpotifyPanel url={spotify} />
            </div>
          )}

          <PreWorkoutCheckIn
            tracksCycle={cycle.tracks}
            suggestedPhase={cycle.phase}
            guidance={cycle.guidance}
            onSave={savePreCheckIn}
            onSkip={() => setPreDone(true)}
          />
        </div>
      </div>
    );
  }
  const setsTotal = activeExercises.reduce((n, e) => n + e.sets.length, 0);
  const setsDone = activeExercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0);
  const volumeKg = Math.round(
    activeExercises.reduce(
      (n, e) =>
        n + e.sets.reduce((m, s) => m + (s.completed && s.loggedWeight && s.loggedReps ? s.loggedWeight * s.loggedReps : 0), 0),
      0,
    ),
  );

  // ── finish screen ──
  if (finished || blocks.length === 0) {
    return (
      <div ref={scrollRef} className="fixed inset-0 z-[60] overflow-y-auto bg-paper">
        <div className="mx-auto max-w-md space-y-5 px-5 py-10">
          <div className="flex flex-col items-center text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gold-100 text-gold-600 shadow-soft">
              <PartyPopper className="h-8 w-8" />
            </span>
            <h1 className="mt-4 font-display text-3xl text-ink">Session done!</h1>
            <p className="mt-1 text-muted">Brilliant work - your coach can see your logs.</p>
          </div>

          {/* PB celebration */}
          {prs.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-gold-300/60 bg-gradient-to-b from-gold-100/80 to-white p-5 text-center shadow-soft">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold-500 text-white shadow-glow">
                <Trophy className="h-6 w-6" />
              </span>
              <div className="mt-3 text-xs font-bold uppercase tracking-luxe text-gold-600">
                New personal best{prs.length > 1 ? "s" : ""}
              </div>
              <div className="mt-1 font-display text-3xl text-ink">
                {prs[0].weight}kg <span className="text-xl">{prs[0].name}</span>
              </div>
              {prs.length > 1 && (
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {prs.slice(1).map((p) => (
                    <span
                      key={p.name}
                      className="rounded-full border border-gold-300/60 bg-white px-2.5 py-1 text-xs font-semibold text-ink"
                    >
                      {p.weight}kg {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 text-center">
              <div className="font-display text-3xl text-royal-700">
                {setsDone}/{setsTotal}
              </div>
              <div className="mt-0.5 text-xs text-muted">sets logged</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="font-display text-3xl text-royal-700">{volumeKg.toLocaleString()}</div>
              <div className="mt-0.5 text-xs text-muted">kg lifted</div>
            </Card>
          </div>

          <CheckInCard checkIn={workout.checkIn} onSave={saveCheckIn} />

          <Button href="/portal" size="lg" className="w-full">
            Back to Today
          </Button>
        </div>
      </div>
    );
  }

  const block = blocks[Math.min(idx, blocks.length - 1)];
  const last = idx >= blocks.length - 1;
  const goPrev = () => setIdx((i) => Math.max(0, i - 1));
  const goNext = () => setIdx((i) => Math.min(blocks.length - 1, i + 1));

  // Swipe left/right anywhere in the body to change exercise.
  const onTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || overview) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && !last) goNext();
    if (dx > 0 && idx > 0) goPrev();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-paper">
      {/* ── header: title row + segmented progress spine ── */}
      <div className="border-b border-line bg-white px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">{workout.title}</div>
            <div className="text-xs text-muted">
              {setsDone}/{setsTotal} sets logged
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/portal")}
            aria-label="Exit session"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-muted transition-colors active:bg-paper"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* one segment per exercise: gold = done, royal = current */}
        <button
          type="button"
          onClick={() => setOverview(true)}
          aria-label="View all exercises"
          className="mt-3 block w-full"
        >
          <div className="flex gap-1">
            {blocks.map((b, i) => {
              const st = blockState(b);
              return (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    st === "done" ? "bg-gold-500" : i === idx ? "bg-royal-600" : "bg-line",
                  )}
                />
              );
            })}
          </div>
          <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-muted">
            Exercise {idx + 1} of {blocks.length}
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
        </button>
      </div>

      {/* ── body (swipeable) ── */}
      <div ref={scrollRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md space-y-4 px-4 py-4 pb-8">
          {block.groupId && (
            <div className="flex items-center gap-2">
              <Badge tone="royal">{block.groupType === "circuit" ? "Circuit" : "Superset"}</Badge>
              <span className="text-xs text-muted">Do these back-to-back.</span>
            </div>
          )}
          {block.items.map((ex, i) => (
            <div key={ex.id} className={cn(i > 0 && "border-t border-line pt-4")}>
              <SessionExercise ex={ex} history={history[ex.exerciseId]} onLog={logSet} onOptOut={(v, note) => optOut(ex.id, v, note)} />
            </div>
          ))}
        </div>
      </div>

      {/* ── bottom nav: small prev, big next ── */}
      <div className="border-t border-line bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md items-center gap-2.5">
          <button
            type="button"
            onClick={goPrev}
            disabled={idx === 0}
            aria-label="Previous exercise"
            className="grid h-12 w-14 shrink-0 place-items-center rounded-xl border border-line bg-white text-ink transition-colors active:bg-paper disabled:opacity-35"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {last ? (
            <button
              type="button"
              onClick={finishSession}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-soft transition-colors active:bg-emerald-700"
            >
              Finish session
              <Check className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-royal-600 text-sm font-semibold text-white shadow-soft transition-colors active:bg-royal-700"
            >
              Next exercise
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── exercise overview bottom sheet ── */}
      {overview && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end" role="dialog" aria-modal="true">
          <button aria-label="Close" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOverview(false)} />
          <div className="relative z-10 max-h-[70dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-white pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-5 py-4">
              <h3 className="font-display text-lg">This session</h3>
              <button type="button" onClick={() => setOverview(false)} aria-label="Close" className="text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="divide-y divide-line/70 px-2">
              {blocks.map((b, i) => {
                const st = blockState(b);
                const names = b.items.map((e) => e.exercise.name).join(" + ");
                const optedOut = b.items.every((e) => e.optedOut) && b.items.length > 0;
                const total = b.items.filter((e) => !e.optedOut).reduce((n, e) => n + e.sets.length, 0);
                const done = b.items.filter((e) => !e.optedOut).reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0);
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => {
                        setIdx(i);
                        setOverview(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors active:bg-paper",
                        i === idx && "bg-royal-50/60",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                          st === "done" ? "bg-gold-100 text-gold-600" : i === idx ? "bg-royal-600 text-white" : "bg-paper text-muted",
                        )}
                      >
                        {st === "done" ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{names}</span>
                        <span className="block text-xs text-muted">
                          {optedOut ? "Opted out" : total > 0 ? `${done}/${total} sets` : "No sets"}
                          {b.groupType ? ` · ${b.groupType}` : ""}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
