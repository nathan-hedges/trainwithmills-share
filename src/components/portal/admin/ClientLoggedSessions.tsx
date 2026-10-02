"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Flame, HeartPulse, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { isCardioCategory, secondsToClock } from "@/lib/duration";
import { Badge, Card, ProgressBar } from "../primitives";

interface Set {
  id: string;
  order: number;
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
interface Exercise {
  id: string;
  prescription: string;
  optedOut: boolean;
  optOutNote: string | null;
  exercise: { name: string; category: string };
  sets: Set[];
}
interface SelfWorkoutRow {
  id: string;
  date: string;
  description: string;
}
interface Session {
  id: string;
  date: string;
  title: string;
  focus: string;
  status: string;
  warmup: string | null;
  checkIn: { energy: number | null; energyBefore: number | null; cyclePhase: string; note: string | null } | null;
  exercises: Exercise[];
}

const energyLabels = ["Drained", "Low", "Okay", "Good", "Energised"];

function fmt(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function statusBadge(status: string) {
  if (status === "completed") return { tone: "green", label: "Completed" };
  if (status === "in_progress") return { tone: "amber", label: "In progress" };
  return { tone: "neutral", label: "Assigned" };
}

function strengthTargetText(set: Set): string {
  return `${set.targetReps}${set.targetRpe ? ` @ RPE ${set.targetRpe}` : ""}`;
}
function cardioTargetText(set: Set): string {
  const parts: string[] = [];
  if (set.workSeconds) parts.push(`${secondsToClock(set.workSeconds)} on`);
  if (set.restSeconds) parts.push(`${secondsToClock(set.restSeconds)} off`);
  const base = parts.join(" / ") || "Interval";
  return set.pace ? `${base} @ ${set.pace}` : base;
}
function loggedText(set: Set, cardio: boolean): string {
  if (cardio) {
    if (set.loggedDistance == null && !set.loggedPace) return "not logged";
    const dist = set.loggedDistance != null ? `${set.loggedDistance}` : "–";
    return set.loggedPace ? `${dist} · ${set.loggedPace}` : dist;
  }
  if (set.loggedReps == null && set.loggedWeight == null) return "not logged";
  return `${set.loggedReps ?? "–"}${set.loggedWeight != null ? ` × ${set.loggedWeight}kg` : ""}`;
}

function SessionCard({ s }: { s: Session }) {
  const [open, setOpen] = useState(false);
  // Opted-out exercises don't count toward the set totals.
  const active = s.exercises.filter((e) => !e.optedOut);
  const total = active.reduce((n, e) => n + e.sets.length, 0);
  const done = active.reduce((n, e) => n + e.sets.filter((x) => x.completed).length, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const badge = statusBadge(s.status);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-royal-50/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{s.title}</span>
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {fmt(s.date)} · {s.focus} · {done}/{total} sets logged
          </div>
        </div>
        <div className="hidden w-28 items-center gap-2 sm:flex">
          <ProgressBar value={pct} className="w-16" />
          <span className="text-xs font-medium tabular-nums">{pct}%</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-line p-4">
          {s.warmup && (
            <div className="flex items-start gap-2 rounded-xl bg-gold-100/40 p-3 text-sm">
              <Flame className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
              <span className="whitespace-pre-line text-ink">{s.warmup}</span>
            </div>
          )}

          {s.exercises.length === 0 && <p className="text-sm text-muted">No exercises in this session.</p>}

          {s.exercises.map((ex) => {
            const cardio = isCardioCategory(ex.exercise.category);
            return (
              <div key={ex.id} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{ex.exercise.name}</span>
                  <Badge tone="royal">{ex.exercise.category}</Badge>
                  {ex.optedOut && <Badge tone="amber">Opted out</Badge>}
                  <span className="text-xs text-muted">{ex.prescription}</span>
                </div>
                {ex.optedOut && ex.optOutNote && (
                  <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs italic text-amber-800">
                    &ldquo;{ex.optOutNote}&rdquo;
                  </p>
                )}
                <div className={cn("mt-2 overflow-hidden rounded-lg border border-line", ex.optedOut && "opacity-50")}>
                  <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 bg-paper px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    <span>{cardio ? "Int" : "Set"}</span>
                    <span>Target</span>
                    <span>Logged</span>
                    <span className="text-center">Done</span>
                  </div>
                  {ex.sets.map((set) => (
                    <div
                      key={set.id}
                      className={cn(
                        "grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 px-3 py-1.5 text-sm",
                        set.completed && "bg-emerald-50/40",
                      )}
                    >
                      <span className="font-semibold text-muted">{set.order}</span>
                      <span className="text-muted">{cardio ? cardioTargetText(set) : strengthTargetText(set)}</span>
                      <span
                        className={cn(
                          loggedText(set, cardio) !== "not logged" ? "font-medium text-ink" : "text-muted/60",
                        )}
                      >
                        {loggedText(set, cardio)}
                      </span>
                      <span className="grid place-items-center">
                        {set.completed ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted/40" />
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {s.checkIn && (
            <div className="rounded-xl border border-royal-100 bg-royal-50/50 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <HeartPulse className="h-4 w-4 text-royal-600" />
                <span className="font-medium text-ink">
                  Energy {s.checkIn.energy ?? s.checkIn.energyBefore}/5
                </span>
                <span className="text-xs text-muted">
                  {energyLabels[(s.checkIn.energy ?? s.checkIn.energyBefore ?? 1) - 1]}
                </span>
                {s.checkIn.cyclePhase !== "none" && (
                  <Badge tone="royal">{s.checkIn.cyclePhase}</Badge>
                )}
              </div>
              {s.checkIn.note && <p className="mt-1 text-xs italic text-muted">&ldquo;{s.checkIn.note}&rdquo;</p>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function ClientLoggedSessions({ clientId }: { clientId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selfWorkouts, setSelfWorkouts] = useState<SelfWorkoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/clients/${clientId}/sessions`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Session[]) => active && setSessions(data))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    fetch(`/api/clients/${clientId}/self-workouts`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SelfWorkoutRow[]) => active && setSelfWorkouts(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [clientId]);

  if (loading) return <Card className="p-8 text-center text-muted">Loading sessions…</Card>;
  if (sessions.length === 0 && selfWorkouts.length === 0)
    return <Card className="p-8 text-center text-muted">No sessions yet for this client.</Card>;

  return (
    <div className="space-y-3">
      {selfWorkouts.length > 0 && (
        <Card className="p-4">
          <h3 className="font-display text-lg">Their own training</h3>
          <p className="text-sm text-muted">Sessions this client logged outside their programming.</p>
          <ul className="mt-3 space-y-2">
            {selfWorkouts.map((sw) => (
              <li key={sw.id} className="rounded-xl border border-line bg-paper px-3 py-2.5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">{fmt(sw.date)}</div>
                <p className="mt-0.5 whitespace-pre-line text-sm text-ink">{sw.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {sessions.map((s) => (
        <SessionCard key={s.id} s={s} />
      ))}
    </div>
  );
}
