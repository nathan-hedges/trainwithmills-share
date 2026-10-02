"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  LayoutTemplate,
  Loader2,
  MoveRight,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "../primitives";
import { Button } from "@/components/ui/Button";
import { MoveDayPicker } from "../MoveDayPicker";
import { WorkoutBuilder, type BuilderWorkout } from "./WorkoutBuilder";
import { phaseOn, PHASE_LABEL, type Phase } from "@/lib/cycle";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Cycle-phase colour key for the programming overlay. */
const PHASE_BAR: Record<Phase, string> = {
  menstrual: "bg-red-400",
  follicular: "bg-emerald-400",
  ovulation: "bg-gold-400",
  luteal: "bg-royal-400",
};

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmt(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", opts);
}
/** Monday (YYYY-MM-DD) of the week `offset` weeks from today. */
function mondayOfOffset(offset: number) {
  const b = new Date();
  b.setDate(b.getDate() + offset * 7);
  const back = (b.getDay() + 6) % 7; // days since Monday (0 if today is Monday)
  b.setDate(b.getDate() - back);
  return toISO(b);
}

// The workout shape (with its exercises + sets) is defined in ./WorkoutBuilder.

const fieldCls =
  "h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink transition-colors focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15";

// What GET /api/templates returns (your endpoint #7) - just what the modal shows.
interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  days: { exercises: { id: string }[] }[];
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-white shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-display text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted transition-colors hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ProgrammingPanel({ clientId }: { clientId: string }) {
  const today = toISO(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState(today);
  const [workouts, setWorkouts] = useState<BuilderWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // Cycle overlay: her setup + logged bleeds, so we can show the phase per day.
  const [cycle, setCycle] = useState<{
    setup: { contraception: string; avgCycleLength: number; avgPeriodLength: number; predicts: boolean };
    recent: { date: string; flow: string | null }[];
  } | null>(null);

  // The 7 days of the visible week, derived from the offset.
  const weekStart = mondayOfOffset(weekOffset);
  const week = Array.from({ length: 7 }, (_, i) => {
    const [y, m, d] = weekStart.split("-").map(Number);
    const dt = new Date(y, m - 1, d + i);
    return { iso: toISO(dt), date: dt.getDate(), label: DOW[i] };
  });
  const weekLabel = `${fmt(week[0].iso, { day: "numeric", month: "short" })} – ${fmt(week[6].iso, { day: "numeric", month: "short" })}`;

  // LOAD - read the client's week from endpoint #1. useCallback keeps this
  // function stable so the effect below only re-runs when the inputs change.
  const loadWeek = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/workouts?weekStart=${weekStart}`);
      if (res.ok) setWorkouts(await res.json());
    } finally {
      setLoading(false);
    }
  }, [clientId, weekStart]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  useEffect(() => {
    let active = true;
    fetch(`/api/clients/${clientId}/cycle`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.status === "active" && d.setup?.predicts) {
          setCycle({ setup: d.setup, recent: d.recent ?? [] });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [clientId]);

  // Phase for each visible day - lets Millie place PB attempts and deloads
  // deliberately rather than by accident.
  const phaseByDay = useMemo(() => {
    if (!cycle) return {} as Record<string, Phase | null>;
    const out: Record<string, Phase | null> = {};
    for (const d of week) out[d.iso] = phaseOn(cycle.setup, cycle.recent, d.iso);
    return out;
  }, [cycle, week]);

  // The workout (if any) on the selected day.
  const workout = workouts.find((w) => w.date === selected);

  function goWeek(delta: number) {
    const next = weekOffset + delta;
    setWeekOffset(next);
    setSelected(mondayOfOffset(next)); // keep the selection inside the new week
  }

  // CREATE - endpoint #2. Re-read the week afterwards so it appears.
  async function createWorkout() {
    setBusy(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, date: selected, title: "New session", focus: "Training" }),
      });
      if (res.ok) await loadWeek();
    } finally {
      setBusy(false);
    }
  }

  // EDIT - endpoint #3 (PATCH). onChange updates the screen instantly;
  // onBlur (leaving the field) saves the value to the server.
  function editLocally(id: string, patch: Partial<BuilderWorkout>) {
    setWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }
  async function saveWorkout(id: string, patch: { title?: string; focus?: string; warmup?: string }) {
    await fetch(`/api/workouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  // DELETE - endpoint #3.
  async function deleteWorkout(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
      if (res.ok) await loadWeek();
    } finally {
      setBusy(false);
    }
  }

  // MOVE/SWAP a session to another day of the visible week.
  const [moving, setMoving] = useState(false);
  async function moveWorkout(id: string, targetDate: string) {
    setMoving(false);
    setBusy(true);
    try {
      const res = await fetch(`/api/workouts/${id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: targetDate }),
      });
      if (res.ok) {
        setSelected(targetDate); // follow the session to its new day
        await loadWeek();
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Templates (endpoints #7 list, #9 apply, #10 save-from-week) ──
  const [modal, setModal] = useState<"apply" | "save" | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [working, setWorking] = useState(false);

  // Open the apply modal and load the coach's templates (#7 GET).
  async function openApply() {
    setModal("apply");
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
  }

  // Apply a template to the visible week (#9), then re-read the week so it shows.
  async function doApply(templateId: string) {
    setWorking(true);
    try {
      const res = await fetch(`/api/templates/${templateId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, weekStart }),
      });
      if (res.ok) {
        setModal(null);
        await loadWeek();
      }
    } finally {
      setWorking(false);
    }
  }

  // Save the visible week as a new template (#10).
  async function doSave() {
    if (!tplName.trim()) return;
    setWorking(true);
    try {
      const res = await fetch("/api/templates/from-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, weekStart, name: tplName, description: tplDesc }),
      });
      if (res.ok) {
        setModal(null);
        setTplName("");
        setTplDesc("");
      }
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Template tools - endpoints #7 (list), #9 (apply), #10 (save-from-week). */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={openApply}>
          <LayoutTemplate className="h-4 w-4" />
          Apply template
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setModal("save")}>
          <Save className="h-4 w-4" />
          Save week as template
        </Button>
      </div>

      {/* Week strip */}
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <button
            onClick={() => goWeek(-1)}
            aria-label="Previous week"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-royal-50 hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            {weekLabel}
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />}
          </span>
          <button
            onClick={() => goWeek(1)}
            aria-label="Next week"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-royal-50 hover:text-ink"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((d) => {
            const has = workouts.some((w) => w.date === d.iso);
            const isSel = d.iso === selected;
            const isToday = d.iso === today;
            return (
              <button
                key={d.iso}
                onClick={() => setSelected(d.iso)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors",
                  isSel
                    ? "border-royal-600 bg-royal-600 text-white"
                    : "border-line bg-white hover:border-royal-300",
                )}
              >
                <span
                  className={cn("text-[10px] font-medium uppercase", isSel ? "text-white/70" : "text-muted")}
                >
                  {d.label}
                </span>
                <span className="font-display text-base">{d.date}</span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    has ? (isSel ? "bg-gold-400" : "bg-royal-500") : isToday ? "bg-gold-400" : "bg-transparent",
                  )}
                />
                {phaseByDay[d.iso] && (
                  <span
                    title={`${PHASE_LABEL[phaseByDay[d.iso]!]} phase`}
                    className={cn(
                      "mt-0.5 h-1 w-6 rounded-full",
                      isSel ? "opacity-80" : "",
                      PHASE_BAR[phaseByDay[d.iso]!],
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {cycle && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-1 pt-2 text-[11px] text-muted">
            <span className="font-medium text-ink">Cycle phase:</span>
            {(Object.keys(PHASE_BAR) as Phase[]).map((ph) => (
              <span key={ph} className="inline-flex items-center gap-1.5">
                <span className={cn("h-1 w-5 rounded-full", PHASE_BAR[ph])} />
                {PHASE_LABEL[ph]}
              </span>
            ))}
            <span>estimated from her logs - to plan around, not a rule.</span>
          </div>
        )}
      </Card>

      {/* Selected day */}
      {workout ? (
        <div className="space-y-3">
          <Card className="p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-muted">
                Session title
                <input
                  value={workout.title}
                  onChange={(e) => editLocally(workout.id, { title: e.target.value })}
                  onBlur={(e) => saveWorkout(workout.id, { title: e.target.value })}
                  className={cn(fieldCls, "font-medium")}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted">
                Focus
                <input
                  value={workout.focus}
                  onChange={(e) => editLocally(workout.id, { focus: e.target.value })}
                  onBlur={(e) => saveWorkout(workout.id, { focus: e.target.value })}
                  className={fieldCls}
                />
              </label>
            </div>
            <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-muted">
              Warmup
              <textarea
                value={workout.warmup ?? ""}
                onChange={(e) => editLocally(workout.id, { warmup: e.target.value })}
                onBlur={(e) => saveWorkout(workout.id, { warmup: e.target.value })}
                rows={2}
                placeholder="e.g. 5 min bike, banded glute work, 2×10 air squats"
                className={cn(fieldCls, "h-auto resize-none py-2")}
              />
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMoving(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-royal-300 disabled:opacity-50"
              >
                <MoveRight className="h-3.5 w-3.5" />
                Move day
              </button>
              <button
                type="button"
                onClick={() => deleteWorkout(workout.id)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete session
              </button>
            </div>
          </Card>

          {/* Real exercise builder - your endpoints #4-6. */}
          <WorkoutBuilder workout={workout} onChanged={loadWeek} />
        </div>
      ) : (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-royal-50 text-royal-600">
            <CalendarPlus className="h-6 w-6" />
          </div>
          <h3 className="font-display text-xl">No session on this day</h3>
          <p className="max-w-sm text-muted">
            {fmt(selected, { weekday: "long", day: "numeric", month: "long" })} is a rest day. Add a session
            to start programming.
          </p>
          <Button onClick={createWorkout} disabled={busy} className="mt-1">
            {busy ? "Creating…" : "Create a session"}
          </Button>
        </Card>
      )}

      {moving && workout && (
        <MoveDayPicker
          title="Move this session"
          options={week.map((d) => ({
            value: d.iso,
            label: d.label,
            sub: String(d.date),
            occupied: workouts.some((w) => w.date === d.iso),
            current: d.iso === workout.date,
          }))}
          onPick={(iso) => moveWorkout(workout.id, iso)}
          onClose={() => setMoving(false)}
        />
      )}

      {modal === "apply" && (
        <Modal title="Apply a template" onClose={() => setModal(null)}>
          <p className="text-sm text-muted">
            This replaces every session in the week of{" "}
            <span className="font-medium text-ink">{weekLabel}</span> for this client.
          </p>
          <div className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {templates.length === 0 && (
              <p className="rounded-xl bg-paper p-4 text-center text-sm text-muted">
                No templates yet. Save a week as a template first.
              </p>
            )}
            {templates.map((t) => {
              const exCount = t.days.reduce((n, d) => n + d.exercises.length, 0);
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{t.name}</div>
                    <div className="text-xs text-muted">
                      {t.days.length} days · {exCount} exercises
                    </div>
                  </div>
                  <Button size="sm" onClick={() => doApply(t.id)} disabled={working}>
                    {working ? "…" : "Apply"}
                  </Button>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {modal === "save" && (
        <Modal title="Save week as template" onClose={() => setModal(null)}>
          <p className="text-sm text-muted">
            Captures this client&apos;s sessions for the week of{" "}
            <span className="font-medium text-ink">{weekLabel}</span> (rest days are skipped).
          </p>
          <div className="mt-3 space-y-3">
            <input
              autoFocus
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="Template name"
              className={fieldCls}
            />
            <input
              value={tplDesc}
              onChange={(e) => setTplDesc(e.target.value)}
              placeholder="Description (optional)"
              className={fieldCls}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <Button size="sm" onClick={doSave} disabled={!tplName.trim() || working}>
              {working ? "Saving…" : "Save template"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
