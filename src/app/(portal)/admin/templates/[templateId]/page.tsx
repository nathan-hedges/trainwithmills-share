"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Layers, MoveRight, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge, Card, PageHeading } from "@/components/portal/primitives";
import { GuideImage } from "@/components/portal/GuideImage";
import { ExerciseModal } from "@/components/portal/ExerciseModal";
import { MoveDayPicker } from "@/components/portal/MoveDayPicker";
import { SortableBlock } from "@/components/portal/SortableBlock";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { clockToSeconds, isCardioCategory, secondsToClock } from "@/lib/duration";

const DOW_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DraftSet {
  targetReps: number;
  targetRpe: string;
  // cardio interval (kept as editable "m:ss" strings; converted on save)
  work: string;
  rest: string;
  pace: string;
}
interface DraftExercise {
  exerciseId: string;
  prescription: string;
  sets: DraftSet[];
  note: string;
  groupKey: string | null;
  groupType: string | null;
}
type DraftDay = { title: string; focus: string; warmup: string; exercises: DraftExercise[] };

// Rows as GET /api/templates/[id] returns them (Prisma shapes).
interface ApiSet {
  targetReps: number;
  targetRpe: string | null;
  workSeconds: number | null;
  restSeconds: number | null;
  pace: string | null;
}
interface ApiExercise {
  exerciseId: string;
  prescription: string;
  note: string | null;
  groupKey: string | null;
  groupType: string | null;
  sets?: ApiSet[];
}
interface LibItem {
  id: string;
  name: string;
  category: string;
  cue?: string | null;
  guideImageUrl?: string | null;
}

const field =
  "h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink transition-colors focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15";
const numField =
  "h-9 w-full rounded-lg border border-line bg-paper px-2 text-center text-sm tabular-nums transition-colors focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15";
const txtField =
  "h-9 w-full rounded-lg border border-line bg-paper px-3 text-sm transition-colors placeholder:text-muted/60 focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15";

export default function TemplateBuilderPage() {
  const params = useParams<{ templateId: string }>();
  const router = useRouter();
  const templateId = params.templateId;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<Record<number, DraftDay>>({});
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [library, setLibrary] = useState<LibItem[]>([]);
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pickQuery, setPickQuery] = useState("");
  const [grouping, setGrouping] = useState(false);
  const [movingDay, setMovingDay] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    let active = true;
    fetch(`/api/templates/${templateId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((t) => {
        if (!active) return;
        if (t) {
          setName(t.name ?? "");
          setDescription(t.description ?? "");
          const init: Record<number, DraftDay> = {};
          for (const d of t.days ?? []) {
            init[d.dow] = {
              title: d.title,
              focus: d.focus,
              warmup: d.warmup ?? "",
              exercises: (d.exercises ?? []).map((e: ApiExercise) => ({
                exerciseId: e.exerciseId,
                prescription: e.prescription,
                sets: (e.sets?.length ? e.sets : [{ targetReps: 10, targetRpe: null }]).map((s: Partial<ApiSet>) => ({
                  targetReps: s.targetReps ?? 10,
                  targetRpe: s.targetRpe ?? "",
                  work: secondsToClock(s.workSeconds),
                  rest: secondsToClock(s.restSeconds),
                  pace: s.pace ?? "",
                })),
                note: e.note ?? "",
                groupKey: e.groupKey ?? null,
                groupType: e.groupType ?? null,
              })),
            };
          }
          setDays(init);
          setActiveDay(t.days?.[0]?.dow ?? null);
        }
        setLoading(false);
      })
      .catch(() => active && setLoading(false));

    loadLibrary();

    return () => {
      active = false;
    };
  }, [templateId]);

  function loadLibrary() {
    fetch("/api/exercises")
      .then((r) => (r.ok ? r.json() : []))
      .then((lib: LibItem[]) => setLibrary(lib))
      .catch(() => {});
  }

  const activeDows = Object.keys(days).map(Number).sort((a, b) => a - b);

  function toggleDay(dow: number) {
    const removing = !!days[dow];
    setGrouping(false);
    setSelected(new Set());
    setDays((prev) => {
      const next = { ...prev };
      if (next[dow]) delete next[dow];
      else next[dow] = { title: `${DOW_FULL[dow]} Session`, focus: "Training", warmup: "", exercises: [] };
      return next;
    });
    if (removing) {
      const remaining = activeDows.filter((d) => d !== dow);
      setActiveDay(remaining[0] ?? null);
    } else {
      setActiveDay(dow);
    }
  }

  function patchDay(dow: number, patch: Partial<DraftDay>) {
    setDays((prev) => ({ ...prev, [dow]: { ...prev[dow], ...patch } }));
  }

  // Move the active day to another weekday; if the target already has a
  // session they swap. Draft-only - persisted when the template is saved.
  function moveDay(target: number) {
    setMovingDay(false);
    if (activeDay === null || target === activeDay) return;
    setDays((prev) => {
      const src = prev[activeDay];
      if (!src) return prev;
      const dst = prev[target];
      const next = { ...prev };
      if (dst) {
        next[activeDay] = dst;
        next[target] = src;
      } else {
        delete next[activeDay];
        next[target] = src;
      }
      return next;
    });
    setActiveDay(target);
  }

  function addExercise(dow: number, exerciseId: string) {
    const cardio = isCardioCategory(library.find((e) => e.id === exerciseId)?.category);
    const seed: DraftSet = cardio
      ? { targetReps: 0, targetRpe: "", work: "0:30", rest: "0:30", pace: "" }
      : { targetReps: 10, targetRpe: "", work: "", rest: "", pace: "" };
    setDays((prev) => {
      const day = prev[dow];
      if (!day || day.exercises.some((e) => e.exerciseId === exerciseId)) return prev;
      return {
        ...prev,
        [dow]: {
          ...day,
          exercises: [
            ...day.exercises,
            {
              exerciseId,
              prescription: cardio ? "3 intervals" : "3 × 10",
              sets: [{ ...seed }, { ...seed }, { ...seed }],
              note: "",
              groupKey: null,
              groupType: null,
            },
          ],
        },
      };
    });
  }

  function patchExercise(dow: number, idx: number, patch: Partial<DraftExercise>) {
    setDays((prev) => {
      const day = prev[dow];
      return {
        ...prev,
        [dow]: { ...day, exercises: day.exercises.map((e, i) => (i === idx ? { ...e, ...patch } : e)) },
      };
    });
  }

  function removeExercise(dow: number, idx: number) {
    setDays((prev) => ({
      ...prev,
      [dow]: { ...prev[dow], exercises: prev[dow].exercises.filter((_, i) => i !== idx) },
    }));
  }

  // ── Per-set editing (mirrors the live programming builder) ──────────
  function patchSet(dow: number, exIdx: number, setIdx: number, patch: Partial<DraftSet>) {
    setDays((prev) => {
      const day = prev[dow];
      const exercises = day.exercises.map((e, i) =>
        i === exIdx ? { ...e, sets: e.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)) } : e,
      );
      return { ...prev, [dow]: { ...day, exercises } };
    });
  }
  function addSet(dow: number, exIdx: number) {
    setDays((prev) => {
      const day = prev[dow];
      const fallback: DraftSet = { targetReps: 10, targetRpe: "", work: "", rest: "", pace: "" };
      const exercises = day.exercises.map((e, i) =>
        i === exIdx ? { ...e, sets: [...e.sets, { ...(e.sets[e.sets.length - 1] ?? fallback) }] } : e,
      );
      return { ...prev, [dow]: { ...day, exercises } };
    });
  }
  function removeSet(dow: number, exIdx: number, setIdx: number) {
    setDays((prev) => {
      const day = prev[dow];
      const exercises = day.exercises.map((e, i) =>
        i === exIdx && e.sets.length > 1 ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e,
      );
      return { ...prev, [dow]: { ...day, exercises } };
    });
  }

  function toggleSelect(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  // Group the selected exercises: assign them a shared groupKey and pull them
  // together so the block renders contiguously.
  function makeGroup(groupType: "superset" | "circuit") {
    if (activeDay === null || selected.size < 2) return;
    const groupKey = crypto.randomUUID();
    setDays((prev) => {
      const day = prev[activeDay];
      const exs = day.exercises;
      const firstIdx = Math.min(...selected);
      const before = exs.filter((_, i) => !selected.has(i) && i < firstIdx);
      const after = exs.filter((_, i) => !selected.has(i) && i > firstIdx);
      const group = exs.filter((_, i) => selected.has(i)).map((e) => ({ ...e, groupKey, groupType }));
      return { ...prev, [activeDay]: { ...day, exercises: [...before, ...group, ...after] } };
    });
    setGrouping(false);
    setSelected(new Set());
  }

  function ungroup(dow: number, groupKey: string) {
    setDays((prev) => ({
      ...prev,
      [dow]: {
        ...prev[dow],
        exercises: prev[dow].exercises.map((e) =>
          e.groupKey === groupKey ? { ...e, groupKey: null, groupType: null } : e,
        ),
      },
    }));
  }

  async function save() {
    setError("");
    if (!name.trim()) return setError("Give your template a name.");
    if (activeDows.length === 0) return setError("Add at least one training day.");
    const dayList = activeDows.map((dow) => {
      const d = days[dow];
      return {
        dow,
        title: d.title.trim() || `${DOW_FULL[dow]} Session`,
        focus: d.focus.trim() || "Training",
        warmup: d.warmup.trim() || null,
        exercises: d.exercises.map((e, i) => {
          const cardio = isCardioCategory(library.find((x) => x.id === e.exerciseId)?.category);
          return {
            exerciseId: e.exerciseId,
            order: i,
            note: e.note.trim() || null,
            groupKey: e.groupKey,
            groupType: e.groupType,
            // The server recomputes the prescription label from these via setPrescription().
            sets: e.sets.map((s) =>
              cardio
                ? {
                    targetReps: 0,
                    targetRpe: null,
                    workSeconds: clockToSeconds(s.work),
                    restSeconds: clockToSeconds(s.rest),
                    pace: s.pace.trim() || null,
                  }
                : {
                    targetReps: Math.max(1, Number(s.targetReps) || 1),
                    targetRpe: s.targetRpe.trim() || null,
                  },
            ),
          };
        }),
      };
    });
    setSaving(true);
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, days: dayList }),
      });
      if (res.ok) router.push("/admin/templates");
      else setError((await res.text()) || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const exName = (id: string) => library.find((e) => e.id === id)?.name ?? "Exercise";
  const exItem = (id: string) => library.find((e) => e.id === id);
  if (loading) {
    return <Card className="p-8 text-center text-muted">Loading template…</Card>;
  }

  const day = activeDay !== null ? days[activeDay] : null;

  // Library picker: filter by search, flag exercises already in this day.
  const assignedIds = new Set(day?.exercises.map((e) => e.exerciseId) ?? []);
  const pickQ = pickQuery.trim().toLowerCase();
  const picks = pickQ
    ? library.filter((ex) => ex.name.toLowerCase().includes(pickQ) || ex.category.toLowerCase().includes(pickQ))
    : library;

  // Group consecutive same-groupKey exercises into display blocks.
  const blocks: { groupKey: string | null; groupType: string | null; items: { ex: DraftExercise; idx: number }[] }[] = [];
  if (day) {
    const seen = new Set<string>();
    day.exercises.forEach((ex, idx) => {
      if (!ex.groupKey) blocks.push({ groupKey: null, groupType: null, items: [{ ex, idx }] });
      else if (!seen.has(ex.groupKey)) {
        seen.add(ex.groupKey);
        blocks.push({
          groupKey: ex.groupKey,
          groupType: ex.groupType,
          items: day.exercises.map((e, i) => ({ ex: e, idx: i })).filter((x) => x.ex.groupKey === ex.groupKey),
        });
      }
    });
  }

  // Drag-to-reorder: groups move as a unit. Reorders the draft; saved on Save.
  const blockId = (b: { groupKey: string | null; items: { ex: DraftExercise }[] }) =>
    b.groupKey ?? b.items[0].ex.exerciseId;
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id || activeDay === null) return;
    const ids = blocks.map(blockId);
    const next = arrayMove(blocks, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    const exercises = next.flatMap((b) => b.items.map((it) => it.ex));
    setDays((prev) => ({ ...prev, [activeDay]: { ...prev[activeDay], exercises } }));
  }

  function exerciseRow(ex: DraftExercise, idx: number) {
    const item = exItem(ex.exerciseId);
    const cardio = isCardioCategory(item?.category);
    const cols = cardio ? "grid-cols-[2rem_1fr_1fr_1fr_2rem]" : "grid-cols-[2rem_1fr_1fr_2rem]";
    return (
      <div key={`${ex.exerciseId}-${idx}`} className="rounded-2xl border border-line bg-white p-4 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line">
            <GuideImage src={item?.guideImageUrl ?? undefined} name={item?.name ?? "Exercise"} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-medium text-ink">{item?.name ?? "Exercise"}</h4>
              {item?.category && <Badge tone="royal">{item.category}</Badge>}
            </div>
            {item?.cue && <p className="mt-0.5 truncate text-xs text-muted">{item.cue}</p>}
          </div>
          <button
            type="button"
            onClick={() => removeExercise(activeDay!, idx)}
            aria-label={`Remove ${item?.name ?? "exercise"}`}
            className="text-muted transition-colors hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Strength: reps + RPE per set. Cardio: work / rest / pace per interval. */}
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
            {ex.sets.map((s, sIdx) => (
              <div key={sIdx} className={cn("grid items-center gap-2", cols)}>
                <span className="text-center text-sm font-semibold text-muted">{sIdx + 1}</span>
                {cardio ? (
                  <>
                    <input
                      type="text"
                      value={s.work}
                      placeholder="0:30"
                      onChange={(e) => patchSet(activeDay!, idx, sIdx, { work: e.target.value })}
                      className={numField}
                    />
                    <input
                      type="text"
                      value={s.rest}
                      placeholder="0:30"
                      onChange={(e) => patchSet(activeDay!, idx, sIdx, { rest: e.target.value })}
                      className={numField}
                    />
                    <input
                      type="text"
                      value={s.pace}
                      placeholder="9 km/h"
                      onChange={(e) => patchSet(activeDay!, idx, sIdx, { pace: e.target.value })}
                      className={numField}
                    />
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      min={1}
                      value={s.targetReps}
                      onChange={(e) =>
                        patchSet(activeDay!, idx, sIdx, { targetReps: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className={numField}
                    />
                    <input
                      type="text"
                      value={s.targetRpe}
                      placeholder="7-8"
                      onChange={(e) => patchSet(activeDay!, idx, sIdx, { targetRpe: e.target.value })}
                      className={numField}
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => removeSet(activeDay!, idx, sIdx)}
                  disabled={ex.sets.length <= 1}
                  aria-label={`Remove ${cardio ? "interval" : "set"} ${sIdx + 1}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:text-red-500 disabled:opacity-30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => addSet(activeDay!, idx)}
            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-royal-300 px-3 py-1.5 text-xs font-semibold text-royal-700 transition-colors hover:bg-royal-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add {cardio ? "interval" : "set"}
          </button>
        </div>

        <input
          value={ex.note}
          onChange={(e) => patchExercise(activeDay!, idx, { note: e.target.value })}
          placeholder="Add a coaching note for this exercise…"
          aria-label={`${item?.name ?? "Exercise"} coaching note`}
          className={`${txtField} mt-3`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/admin/templates"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All templates
      </Link>

      <PageHeading
        title="Edit template"
        subtitle="Pick training days, set a warmup, then add exercises -group them into supersets or circuits."
      >
        <Button onClick={save} size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save template"}
        </Button>
      </PageHeading>

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tpl-name" className="mb-1.5 block text-sm font-medium text-ink">
              Template name
            </label>
            <input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Upper / Lower - 4 Day"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="tpl-desc" className="mb-1.5 block text-sm font-medium text-ink">
              Description <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Who it's for, the goal…"
              className={field}
            />
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </Card>

      <Card className="p-4">
        <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Training days</div>
        <div className="grid grid-cols-7 gap-1.5">
          {DOW_SHORT.map((label, dow) => {
            const on = !!days[dow];
            return (
              <button
                key={dow}
                type="button"
                onClick={() => toggleDay(dow)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border py-2.5 text-sm transition-colors",
                  on ? "border-royal-600 bg-royal-600 text-white" : "border-line bg-white text-muted hover:border-royal-300",
                )}
              >
                <span className="text-[10px] font-medium uppercase">{label}</span>
                <span className="font-display">{on ? days[dow].exercises.length : "+"}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-1 text-xs text-muted">
          Tap a day to add or remove it. The number shows how many exercises it has.
        </p>
      </Card>

      {activeDows.length > 0 && (
        <Card className="p-3">
          <div className="flex flex-wrap gap-1.5">
            {activeDows.map((dow) => (
              <button
                key={dow}
                type="button"
                onClick={() => {
                  setActiveDay(dow);
                  setGrouping(false);
                  setSelected(new Set());
                }}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  activeDay === dow ? "bg-royal-600 text-white" : "bg-paper text-muted hover:text-ink",
                )}
              >
                {DOW_SHORT[dow]}
              </button>
            ))}
          </div>
        </Card>
      )}

      {activeDay !== null && day && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink">{DOW_FULL[activeDay]}</span>
            <button
              type="button"
              onClick={() => setMovingDay(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-royal-300"
            >
              <MoveRight className="h-3.5 w-3.5" />
              Move day
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted">
              Session title
              <input
                value={day.title}
                onChange={(e) => patchDay(activeDay, { title: e.target.value })}
                className={cn(field, "font-medium")}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted">
              Focus
              <input value={day.focus} onChange={(e) => patchDay(activeDay, { focus: e.target.value })} className={field} />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Warmup
            <textarea
              value={day.warmup}
              onChange={(e) => patchDay(activeDay, { warmup: e.target.value })}
              rows={2}
              placeholder="e.g. 5 min bike, banded glute work, 2×10 air squats"
              className={cn(field, "h-auto resize-none py-2")}
            />
          </label>

          {grouping ? (
            <div className="space-y-3 rounded-2xl border border-royal-200 bg-royal-50/40 p-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-ink">Select two or more to group</h4>
                <button
                  type="button"
                  onClick={() => {
                    setGrouping(false);
                    setSelected(new Set());
                  }}
                  aria-label="Cancel grouping"
                  className="text-muted hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-1.5">
                {day.exercises.map((ex, idx) => {
                  const on = selected.has(idx);
                  return (
                    <label
                      key={`${ex.exerciseId}-${idx}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors",
                        on ? "border-royal-500 bg-white" : "border-line bg-white hover:border-royal-300",
                      )}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggleSelect(idx)} />
                      <span className="flex-1 font-medium text-ink">{exName(ex.exerciseId)}</span>
                      {ex.groupType && <Badge tone="neutral">{ex.groupType}</Badge>}
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" disabled={selected.size < 2} onClick={() => makeGroup("superset")}>
                  Make superset
                </Button>
                <Button size="sm" disabled={selected.size < 2} onClick={() => makeGroup("circuit")}>
                  Make circuit
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {day.exercises.length === 0 && (
                <p className="rounded-xl bg-paper p-4 text-center text-sm text-muted">No exercises yet. Add one below.</p>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={blocks.map(blockId)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {blocks.map((block) => (
                      <SortableBlock key={blockId(block)} id={blockId(block)}>
                        {block.groupKey ? (
                          <div className="space-y-2 rounded-2xl border-l-4 border-royal-400 bg-royal-50/30 p-2">
                            <div className="flex items-center justify-between px-2 pt-1">
                              <Badge tone="royal">{block.groupType === "circuit" ? "Circuit" : "Superset"}</Badge>
                              <button
                                type="button"
                                onClick={() => ungroup(activeDay, block.groupKey!)}
                                className="text-xs font-semibold text-muted transition-colors hover:text-ink"
                              >
                                Ungroup
                              </button>
                            </div>
                            {block.items.map(({ ex, idx }) => exerciseRow(ex, idx))}
                          </div>
                        ) : (
                          exerciseRow(block.items[0].ex, block.items[0].idx)
                        )}
                      </SortableBlock>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {!grouping && (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-royal-300 bg-royal-50/40 py-3 text-sm font-semibold text-royal-700 transition-colors hover:bg-royal-50"
                >
                  <Plus className="h-4 w-4" />
                  Add exercise
                </button>
                {day.exercises.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => setGrouping(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-royal-300"
                  >
                    <Layers className="h-4 w-4" />
                    Group
                  </button>
                )}
              </div>

              {picking && (
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-ink">Add from your library</h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCreating(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-royal-200 bg-royal-50 px-2.5 py-1.5 text-xs font-semibold text-royal-700 transition-colors hover:bg-royal-100"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        New exercise
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPicking(false);
                          setPickQuery("");
                        }}
                        aria-label="Close"
                        className="text-muted hover:text-ink"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="search"
                      autoFocus
                      value={pickQuery}
                      onChange={(e) => setPickQuery(e.target.value)}
                      placeholder="Search exercises"
                      className="h-10 w-full rounded-xl border border-line bg-paper pl-9 pr-3 text-sm text-ink placeholder:text-muted/60 focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-royal-500/10"
                    />
                  </div>
                  {picks.length === 0 ? (
                    <p className="mt-3 py-4 text-center text-sm text-muted">
                      {library.length === 0 ? "No exercises in your library yet." : "No exercises match your search."}
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {picks.map((ex) => {
                        const added = assignedIds.has(ex.id);
                        return (
                          <button
                            key={ex.id}
                            type="button"
                            disabled={added}
                            onClick={() => {
                              addExercise(activeDay, ex.id);
                              setPicking(false);
                              setPickQuery("");
                            }}
                            className={cn(
                              "flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left text-sm transition-colors",
                              added ? "cursor-not-allowed opacity-40" : "hover:border-royal-300 hover:bg-royal-50",
                            )}
                          >
                            <span>
                              <span className="font-medium text-ink">{ex.name}</span>
                              <span className="ml-2 text-xs text-muted">{ex.category}</span>
                            </span>
                            {added ? <span className="text-xs text-muted">Added</span> : <Plus className="h-4 w-4 text-royal-600" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </Card>
      )}

      {movingDay && activeDay !== null && (
        <MoveDayPicker
          title="Move this day"
          options={DOW_SHORT.map((label, dow) => ({
            value: String(dow),
            label,
            occupied: !!days[dow],
            current: dow === activeDay,
          }))}
          onPick={(v) => moveDay(Number(v))}
          onClose={() => setMovingDay(false)}
        />
      )}

      {creating && (
        <ExerciseModal
          onClose={() => setCreating(false)}
          onSaved={(saved) => {
            setCreating(false);
            loadLibrary();
            if (activeDay !== null) addExercise(activeDay, saved.id);
            setPicking(false);
            setPickQuery("");
          }}
        />
      )}
    </div>
  );
}
