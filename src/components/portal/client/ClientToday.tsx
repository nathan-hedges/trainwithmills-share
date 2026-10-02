"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CalendarCheck, CalendarHeart, Flame, Play, Trophy } from "lucide-react";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/utils";
import { Badge, Card, ProgressBar } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import { ExerciseCard, type CardExercise, type ChartPoint, type SetPatch } from "./ExerciseCard";
import { CheckInCard, type CheckInData } from "./CheckInCard";
import { SpotifyPanel } from "./SpotifyPanel";
import { PHASE_LABEL, type Phase } from "@/lib/cycle";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmt(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", opts);
}

interface WorkoutT {
  id: string;
  date: string;
  title: string;
  focus: string;
  status: string;
  warmup: string | null;
  exercises: CardExercise[];
  checkIn: CheckInData | null;
}
interface HistorySeries {
  exerciseId: string;
  points: { date: string; topWeight: number }[];
}
interface SelfWorkoutT {
  id: string;
  date: string;
  description: string;
  createdAt: string;
}

/** exerciseId -> that client's last logged top set (from /exercise-history). */
type LastTimeMap = Record<string, { date: string; topWeight: number; topReps: number }>;

/** Group same-groupId exercises into superset/circuit blocks (in display order). */
function groupBlocks(exercises: CardExercise[]) {
  const blocks: { groupId: string | null; groupType: string | null; items: CardExercise[] }[] = [];
  const seen = new Set<string>();
  for (const ex of exercises) {
    if (!ex.groupId) {
      blocks.push({ groupId: null, groupType: null, items: [ex] });
    } else if (!seen.has(ex.groupId)) {
      seen.add(ex.groupId);
      blocks.push({
        groupId: ex.groupId,
        groupType: ex.groupType,
        items: exercises.filter((e) => e.groupId === ex.groupId),
      });
    }
  }
  return blocks;
}

/**
 * The client's "Today" training view - original look, real data.
 * When `previewClientId` is set (a coach previewing), it reads that client's
 * data read-only via the coach endpoints; otherwise the signed-in client's own.
 */
export function ClientToday({
  previewClientId,
  spotifyUrl,
}: {
  previewClientId?: string;
  /** Millie's Spotify link, shown at the top of the session. */
  spotifyUrl?: string;
}) {
  const readOnly = !!previewClientId;
  const base = previewClientId ? `/api/clients/${previewClientId}` : "/api/me";
  const today = toISO(new Date());
  const [selected, setSelected] = useState(today);
  const [workouts, setWorkouts] = useState<WorkoutT[]>([]);
  const [history, setHistory] = useState<HistorySeries[]>([]);
  const [lastTime, setLastTime] = useState<LastTimeMap>({});
  const [cyclePhase, setCyclePhase] = useState<{
    phase: string;
    label: string;
    day: number | null;
    private: boolean;
  } | null>(null);
  const [sessionPrs, setSessionPrs] = useState<{ name: string; weight: number }[]>([]);

  // The current week (Mon..Sun) - the client view shows just this week.
  const todayDate = new Date(`${today}T00:00:00`);
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - ((todayDate.getDay() + 6) % 7));
  const weekStart = toISO(monday);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { iso: toISO(d), date: d.getDate() };
  });

  const loadWeek = useCallback(async () => {
    const res = await fetch(`${base}/workouts?weekStart=${weekStart}`);
    if (res.ok) setWorkouts(await res.json());
  }, [base, weekStart]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  // ── Self-logged sessions (the client's own training, outside programming) ──
  const selfBase = previewClientId ? `/api/clients/${previewClientId}/self-workouts` : "/api/me/self-workouts";
  const [selfWorkouts, setSelfWorkouts] = useState<SelfWorkoutT[]>([]);
  const loadSelf = useCallback(async () => {
    const res = await fetch(`${selfBase}?weekStart=${weekStart}`).catch(() => null);
    if (res?.ok) setSelfWorkouts(await res.json());
  }, [selfBase, weekStart]);

  useEffect(() => {
    loadSelf();
  }, [loadSelf]);

  async function addSelfWorkout(description: string) {
    if (readOnly) return;
    await fetch("/api/me/self-workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selected, description }),
    });
    await loadSelf();
  }
  async function deleteSelfWorkout(id: string) {
    if (readOnly) return;
    await fetch(`/api/me/self-workouts/${id}`, { method: "DELETE" });
    await loadSelf();
  }

  useEffect(() => {
    let active = true;
    fetch(`${base}/analytics`)
      .then((r) => (r.ok ? r.json() : null))
      .then((a) => {
        if (active && a) setHistory(a.history);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [base]);

  // Last logged top set per exercise - prefills the set rows (same source as
  // session mode, so both ways of logging behave identically).
  useEffect(() => {
    let active = true;
    fetch(`${base}/exercise-history`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m: LastTimeMap | null) => {
        if (active && m) setLastTime(m);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [base]);

  // Her cycle phase today (only when she's tracking) - shown on the card and
  // preselected in the check-in so she isn't re-entering what we already know.
  //
  // IMPORTANT: the check-in's cyclePhase IS visible to the coach, so when she's
  // tracking privately we show the phase to her here but never prefill it -
  // otherwise "Millie sees nothing" would quietly stop being true.
  useEffect(() => {
    if (previewClientId) return; // coach preview: not her data to fetch
    let active = true;
    fetch("/api/me/cycle")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            status?: string;
            profile?: { shareLevel?: string };
            prediction?: { phase: string | null; cycleDay: number | null };
          } | null,
        ) => {
          if (!active || d?.status !== "active" || !d.prediction?.phase) return;
          const phase = d.prediction.phase;
          setCyclePhase({
            phase,
            label: PHASE_LABEL[phase as Phase] ?? phase,
            day: d.prediction.cycleDay,
            private: d.profile?.shareLevel === "private",
          });
        },
      )
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [previewClientId]);

  const workout = workouts.find((w) => w.date === selected);

  function progressFor(exerciseId: string): ChartPoint[] {
    const s = history.find((h) => h.exerciseId === exerciseId);
    return s ? s.points.map((p) => ({ date: p.date, weight: p.topWeight })) : [];
  }

  // LOG a set - optimistic update + PATCH #12. If the server says the workout
  // auto-completed (everything done or opted out), refresh so the banner shows.
  async function logSet(setId: string, patch: SetPatch) {
    if (readOnly || !workout) return;
    const wid = workout.id;
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id !== wid
          ? w
          : {
              ...w,
              status: w.status === "assigned" ? "in_progress" : w.status,
              exercises: w.exercises.map((e) => ({
                ...e,
                sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
              })),
            },
      ),
    );
    const res = await fetch(`/api/sets/${setId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.workoutCompleted) {
        const prs = Array.isArray(data.prs) ? data.prs : [];
        setSessionPrs(prs);
        celebrate(prs.length > 0);
        await loadWeek();
      }
    }
  }

  // OPT OUT of one exercise (or undo) - optimistic, then POST.
  async function optOutExercise(exId: string, optedOut: boolean, note?: string) {
    if (readOnly || !workout) return;
    const wid = workout.id;
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id !== wid
          ? w
          : {
              ...w,
              exercises: w.exercises.map((e) =>
                e.id === exId ? { ...e, optedOut, optOutNote: optedOut ? (note ?? null) : null } : e,
              ),
            },
      ),
    );
    const res = await fetch(`/api/workout-exercises/${exId}/opt-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optedOut, note }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.workoutCompleted) await loadWeek();
    }
  }

  async function saveCheckIn(data: CheckInData) {
    if (readOnly || !workout) return;
    await fetch(`/api/workouts/${workout.id}/check-in`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await loadWeek();
  }

  async function complete() {
    if (readOnly || !workout) return;
    const res = await fetch(`/api/workouts/${workout.id}/complete`, { method: "POST" });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const prs = Array.isArray(data?.prs) ? data.prs : [];
      setSessionPrs(prs);
      celebrate(prs.length > 0);
    }
    await loadWeek();
  }

  // Progress: opted-out exercises count as done (their sets count as completed).
  const setsTotal = workout ? workout.exercises.reduce((n, e) => n + e.sets.length, 0) : 0;
  const setsDone = workout
    ? workout.exercises.reduce(
        (n, e) => n + (e.optedOut ? e.sets.length : e.sets.filter((s) => s.completed).length),
        0,
      )
    : 0;
  const pct = setsTotal ? Math.round((setsDone / setsTotal) * 100) : 0;
  const exercisesDone = workout
    ? workout.exercises.filter((e) => e.optedOut || (e.sets.length > 0 && e.sets.every((s) => s.completed)))
        .length
    : 0;
  const isComplete = workout?.status === "completed";
  const isToday = selected === today;

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5 sm:gap-2">
        {week.map((day, i) => {
          const has = workouts.some((w) => w.date === day.iso);
          const isSel = day.iso === selected;
          const isTod = day.iso === today;
          return (
            <button
              key={day.iso}
              onClick={() => setSelected(day.iso)}
              className={cn(
                "flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-2xl border py-3 transition-colors",
                isSel
                  ? "border-royal-600 bg-royal-600 text-white shadow-soft"
                  : "border-line bg-white text-ink hover:border-royal-300",
              )}
            >
              <span className={cn("text-[11px] font-medium uppercase", isSel ? "text-white/70" : "text-muted")}>
                {DOW[i]}
              </span>
              <span className="font-display text-lg">{day.date}</span>
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  has ? (isSel ? "bg-gold-400" : "bg-royal-500") : isTod ? "bg-gold-400" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Where she is in her cycle - only when she's tracking. */}
      {cyclePhase && selected === today && (
        <Link
          href="/portal/cycle"
          className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm transition-colors hover:border-royal-300"
        >
          <CalendarHeart className="h-4 w-4 shrink-0 text-royal-600" />
          <span className="text-ink">
            {cyclePhase.day ? `Day ${cyclePhase.day} · ` : ""}
            <span className="font-medium">{cyclePhase.label} phase</span>
          </span>
          <span className="ml-auto text-xs text-muted">See guidance</span>
        </Link>
      )}

      {/* Music sits at the top of the session, collapsed until she wants it. */}
      {spotifyUrl && workout && (
        <SpotifyPanel url={spotifyUrl} />
      )}

      {workout ? (
        <>
          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="royal">
                    <Flame className="h-3.5 w-3.5" />
                    {workout.focus}
                  </Badge>
                  {isToday && <span className="text-xs font-medium text-gold-600">Today</span>}
                </div>
                <h2 className="mt-2 font-display text-2xl">{workout.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {fmt(selected, { weekday: "long", day: "numeric", month: "long" })} ·{" "}
                  {workout.exercises.length} exercises
                </p>
              </div>
              <div className="text-right">
                <div className="font-display text-3xl text-royal-700">{pct}%</div>
                <div className="text-xs text-muted">
                  {exercisesDone}/{workout.exercises.length} done
                </div>
              </div>
            </div>
            <ProgressBar value={pct} className="mt-4" />
            {!readOnly && workout.exercises.length > 0 && (
              <Button
                href={`/portal/session/${workout.id}`}
                size="lg"
                variant={isComplete ? "secondary" : "primary"}
                className="mt-4 w-full"
              >
                <Play className="h-5 w-5" />
                {isComplete
                  ? "Review session"
                  : workout.status === "in_progress"
                    ? "Continue session"
                    : "Start session"}
              </Button>
            )}
          </Card>

          {workout.warmup && (
            <Card className="flex items-start gap-3 border-gold-400/30 bg-gold-100/40 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600">
                <Flame className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-semibold text-ink">Warm-up</div>
                <p className="whitespace-pre-line text-sm text-muted">{workout.warmup}</p>
              </div>
            </Card>
          )}

          <CheckInCard
            key={workout.id}
            checkIn={workout.checkIn}
            readOnly={readOnly}
            onSave={saveCheckIn}
          />

          <div className="space-y-4">
            {groupBlocks(workout.exercises).map((block) =>
              block.groupId ? (
                <div
                  key={block.groupId}
                  className="space-y-3 rounded-2xl border-l-4 border-royal-400 bg-royal-50/40 p-2 sm:p-3"
                >
                  <div className="flex items-center gap-2 px-1">
                    <Badge tone="royal">{block.groupType === "circuit" ? "Circuit" : "Superset"}</Badge>
                    <span className="text-xs text-muted">Do these back-to-back.</span>
                  </div>
                  {block.items.map((a) => (
                    <ExerciseCard
                      key={a.id}
                      assigned={a}
                      unit="kg"
                      progress={progressFor(a.exerciseId)}
                      lastTime={lastTime[a.exerciseId]}
                      readOnly={readOnly}
                      onLog={logSet}
                      onOptOut={(v, note) => optOutExercise(a.id, v, note)}
                    />
                  ))}
                </div>
              ) : (
                <ExerciseCard
                  key={block.items[0].id}
                  assigned={block.items[0]}
                  unit="kg"
                  progress={progressFor(block.items[0].exerciseId)}
                  lastTime={lastTime[block.items[0].exerciseId]}
                  readOnly={readOnly}
                  onLog={logSet}
                  onOptOut={(v, note) => optOutExercise(block.items[0].id, v, note)}
                />
              ),
            )}
          </div>

          {isComplete ? (
            <Card className="flex items-center gap-4 border-emerald-200 bg-emerald-50 p-5">
              <BadgeCheck className="h-8 w-8 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <div className="font-display text-lg text-emerald-900">Workout complete - nice work!</div>
                <div className="text-sm text-emerald-700">
                  Your coach can see your logs. See you next session.
                </div>
                {sessionPrs.length > 0 && (
                  <div className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-gold-100/80 px-2.5 py-1.5 text-sm font-semibold text-ink">
                    <Trophy className="h-4 w-4 text-gold-600" />
                    New PB: {sessionPrs[0].weight}kg {sessionPrs[0].name}
                    {sessionPrs.length > 1 && <span className="font-normal text-muted">+{sessionPrs.length - 1} more</span>}
                  </div>
                )}
              </div>
            </Card>
          ) : !readOnly ? (
            <div className="flex justify-center pt-2">
              <Button onClick={complete} size="lg" disabled={workout.exercises.length === 0}>
                Mark workout complete
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-royal-50 text-royal-600">
            <CalendarCheck className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl">Rest day</h2>
          <p className="max-w-sm text-muted">
            Nothing assigned for {fmt(selected, { weekday: "long", day: "numeric", month: "long" })} - recover well.
          </p>
        </Card>
      )}

      <SelfTraining
        entries={selfWorkouts.filter((s) => s.date === selected)}
        readOnly={readOnly}
        onAdd={addSelfWorkout}
        onDelete={deleteSelfWorkout}
      />
    </div>
  );
}

/** "Did your own thing?" - the client logs a session outside their programming
 *  as a plain description, so the coach knows. */
function SelfTraining({
  entries,
  readOnly,
  onAdd,
  onDelete,
}: {
  entries: SelfWorkoutT[];
  readOnly?: boolean;
  onAdd: (description: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  if (readOnly && entries.length === 0) return null;

  async function save() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd(text.trim());
      setText("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg">Your own training</h3>
          <p className="text-sm text-muted">Did something outside your plan? Note it so your coach knows.</p>
        </div>
        {!readOnly && !open && (
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Log a session
          </Button>
        )}
      </div>

      {open && !readOnly && (
        <div className="mt-3 space-y-2">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="e.g. 45 min spin class, felt strong - or 5k easy run with a friend"
            className="w-full resize-none rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-royal-400 focus:bg-white focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setText("");
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <Button size="sm" onClick={save} disabled={!text.trim() || busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <ul className="mt-3 space-y-2">
          {entries.map((s) => (
            <li
              key={s.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-line bg-paper px-3 py-2.5"
            >
              <p className="min-w-0 whitespace-pre-line text-sm text-ink">{s.description}</p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onDelete(s.id)}
                  className="shrink-0 text-xs font-medium text-muted transition-colors hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
