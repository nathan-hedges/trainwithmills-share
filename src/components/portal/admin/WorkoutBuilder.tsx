"use client";

import { useEffect, useState } from "react";
import { Layers, Plus, Search, Sparkles, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Badge, Card } from "../primitives";
import { Button } from "@/components/ui/Button";
import { ExerciseModal } from "../ExerciseModal";
import { SortableBlock } from "../SortableBlock";
import { BuilderExerciseRow, type SetInput } from "./BuilderExerciseRow";

// ── Shapes from GET /api/clients/[id]/workouts (endpoint #1) ──
export interface BuilderSet {
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
export interface BuilderExercise {
  id: string;
  exerciseId: string;
  order: number;
  prescription: string;
  note: string | null;
  optedOut: boolean;
  optOutNote: string | null;
  groupId: string | null;
  groupType: string | null;
  exercise: { id: string; name: string; category: string; cue: string | null; guideImageUrl: string | null };
  sets: BuilderSet[];
}
export interface BuilderWorkout {
  id: string;
  clientId: string;
  date: string;
  title: string;
  focus: string;
  status: string;
  warmup: string | null;
  exercises: BuilderExercise[];
}

interface LibraryItem {
  id: string;
  name: string;
  category: string;
  cue: string | null;
  guideImageUrl: string | null;
}

/** One exercise's last logged performance + a suggested next load (from #history endpoint). */
export interface ExerciseHistory {
  date: string;
  topWeight: number;
  topReps: number;
  allDone: boolean;
  suggestion: number;
}

const json = { "Content-Type": "application/json" };

export function WorkoutBuilder({
  workout,
  onChanged,
}: {
  workout: BuilderWorkout;
  onChanged: () => void | Promise<void>;
}) {
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pickQuery, setPickQuery] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<Record<string, ExerciseHistory>>({});

  function loadLibrary() {
    fetch("/api/exercises").then((r) => (r.ok ? r.json() : [])).then(setLibrary).catch(() => {});
  }
  useEffect(loadLibrary, []);

  // Progressive-overload hints: the client's last logged performance per exercise.
  useEffect(() => {
    fetch(`/api/clients/${workout.clientId}/exercise-history`)
      .then((r) => (r.ok ? r.json() : {}))
      .then(setHistory)
      .catch(() => {});
  }, [workout.clientId]);

  const assignedIds = new Set(workout.exercises.map((e) => e.exerciseId));
  const pickQ = pickQuery.trim().toLowerCase();
  const picks = pickQ
    ? library.filter((ex) => ex.name.toLowerCase().includes(pickQ) || ex.category.toLowerCase().includes(pickQ))
    : library;

  // ── mutations ──
  async function addExercise(exerciseId: string) {
    await fetch(`/api/workouts/${workout.id}/exercises`, { method: "POST", headers: json, body: JSON.stringify({ exerciseId }) });
    setPicking(false);
    setPickQuery("");
    await onChanged();
  }
  async function removeExercise(id: string) {
    await fetch(`/api/workout-exercises/${id}`, { method: "DELETE" });
    await onChanged();
  }
  async function setSets(id: string, sets: SetInput[]) {
    await fetch(`/api/workout-exercises/${id}/sets`, { method: "PUT", headers: json, body: JSON.stringify({ sets }) });
    await onChanged();
  }
  async function setNote(id: string, note: string) {
    await fetch(`/api/workout-exercises/${id}`, { method: "PATCH", headers: json, body: JSON.stringify({ note }) });
  }
  async function makeGroup(groupType: "superset" | "circuit") {
    await fetch("/api/workout-exercises/group", { method: "POST", headers: json, body: JSON.stringify({ ids: [...selected], groupType }) });
    setSelecting(false);
    setSelected(new Set());
    await onChanged();
  }
  async function ungroup(ids: string[]) {
    await fetch("/api/workout-exercises/group", { method: "POST", headers: json, body: JSON.stringify({ ids, groupType: null }) });
    await onChanged();
  }

  // Group consecutive same-groupId exercises into blocks (in display order).
  const blocks: { groupId: string | null; groupType: string | null; items: BuilderExercise[] }[] = [];
  const seen = new Set<string>();
  for (const ex of workout.exercises) {
    if (!ex.groupId) {
      blocks.push({ groupId: null, groupType: null, items: [ex] });
    } else if (!seen.has(ex.groupId)) {
      seen.add(ex.groupId);
      blocks.push({
        groupId: ex.groupId,
        groupType: ex.groupType,
        items: workout.exercises.filter((e) => e.groupId === ex.groupId),
      });
    }
  }

  const rowProps = (ex: BuilderExercise) => ({
    assigned: ex,
    history: history[ex.exerciseId],
    onSets: (s: SetInput[]) => setSets(ex.id, s),
    onNote: (n: string) => setNote(ex.id, n),
    onRemove: () => removeExercise(ex.id),
  });

  // ── Drag-to-reorder (block level: groups move as a unit) ──
  const blockId = (b: { groupId: string | null; items: BuilderExercise[] }) => b.groupId ?? b.items[0].id;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = blocks.map(blockId);
    const next = arrayMove(blocks, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    const orderedExerciseIds = next.flatMap((b) => b.items.map((x) => x.id));
    await fetch(`/api/workouts/${workout.id}/exercises/reorder`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ ids: orderedExerciseIds }),
    });
    await onChanged();
  }

  // ── selecting mode (group builder) ──
  if (selecting) {
    return (
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-ink">Group into a superset / circuit</h4>
          <button type="button" onClick={() => { setSelecting(false); setSelected(new Set()); }} aria-label="Cancel" className="text-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-muted">Select two or more exercises, then choose a type.</p>
        <div className="space-y-1.5">
          {workout.exercises.map((ex) => {
            const on = selected.has(ex.id);
            return (
              <label
                key={ex.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors",
                  on ? "border-royal-500 bg-royal-50" : "border-line hover:border-royal-300",
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(ex.id)) next.delete(ex.id);
                      else next.add(ex.id);
                      return next;
                    })
                  }
                />
                <span className="flex-1 font-medium text-ink">{ex.exercise.name}</span>
                {ex.groupType && <Badge tone="neutral">{ex.groupType}</Badge>}
              </label>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" disabled={selected.size < 2} onClick={() => makeGroup("superset")}>
            Make superset
          </Button>
          <Button size="sm" disabled={selected.size < 2} onClick={() => makeGroup("circuit")}>
            Make circuit
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {workout.exercises.length === 0 && (
        <Card className="p-8 text-center text-muted">No exercises yet - add your first one below.</Card>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={blocks.map(blockId)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {blocks.map((block) => (
              <SortableBlock key={blockId(block)} id={blockId(block)}>
                {block.groupId ? (
                  <div className="space-y-2 rounded-2xl border-l-4 border-royal-400 bg-royal-50/30 p-2">
                    <div className="flex items-center justify-between px-2 pt-1">
                      <Badge tone="royal">{block.groupType === "circuit" ? "Circuit" : "Superset"}</Badge>
                      <button
                        type="button"
                        onClick={() => ungroup(block.items.map((i) => i.id))}
                        className="text-xs font-semibold text-muted transition-colors hover:text-ink"
                      >
                        Ungroup
                      </button>
                    </div>
                    {block.items.map((ex) => (
                      <BuilderExerciseRow key={ex.id} {...rowProps(ex)} />
                    ))}
                  </div>
                ) : (
                  <BuilderExerciseRow {...rowProps(block.items[0])} />
                )}
              </SortableBlock>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-royal-300 bg-royal-50/40 py-3 text-sm font-semibold text-royal-700 transition-colors hover:bg-royal-50"
        >
          <Plus className="h-4 w-4" />
          Add exercise
        </button>
        {workout.exercises.length >= 2 && (
          <button
            type="button"
            onClick={() => setSelecting(true)}
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
              <button type="button" onClick={() => { setPicking(false); setPickQuery(""); }} aria-label="Close" className="text-muted hover:text-ink">
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
                    onClick={() => addExercise(ex.id)}
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

      {creating && (
        <ExerciseModal
          onClose={() => setCreating(false)}
          onSaved={(saved) => {
            setCreating(false);
            loadLibrary();
            addExercise(saved.id);
          }}
        />
      )}
    </div>
  );
}
