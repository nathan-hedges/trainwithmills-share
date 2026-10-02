"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Card } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import type { Meal, MealCategory } from "@/lib/nutrition/types";

const CATEGORIES: MealCategory[] = ["Breakfast", "Lunch", "Dinner", "Snack"];
const field =
  "h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15";
const area = "min-h-[64px] resize-none py-2";

const blank: Meal = {
  id: "",
  name: "",
  category: "Lunch",
  description: "",
  recipe: [],
  price: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  calories: 0,
  budget: false,
  education: null,
  coachNote: null,
};

function MealForm({
  initial,
  onSaved,
  onClose,
}: {
  initial: Meal;
  onSaved: (m: Meal) => void;
  onClose: () => void;
}) {
  const [m, setM] = useState<Meal>(initial);
  const [recipeText, setRecipeText] = useState(initial.recipe.join("\n"));
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Meal>) => setM((prev) => ({ ...prev, ...patch }));

  async function save() {
    setSaving(true);
    const payload = { ...m, recipe: recipeText.split("\n").map((s) => s.trim()).filter(Boolean) };
    try {
      const res = await fetch(m.id ? `/api/meals/${m.id}` : "/api/meals", {
        method: m.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) onSaved(await res.json());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-white p-5 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg">{initial.id ? "Edit item" : "New meal / snack"}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <input value={m.name} onChange={(e) => set({ name: e.target.value })} placeholder="Name" className={field} />
          <div className="grid grid-cols-2 gap-3">
            <select value={m.category} onChange={(e) => set({ category: e.target.value as MealCategory })} className={field}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 text-sm text-muted">
              <input type="checkbox" checked={m.budget} onChange={(e) => set({ budget: e.target.checked })} />
              Budget-friendly
            </label>
          </div>
          <textarea
            value={m.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Short description"
            rows={2}
            className={cn(field, "h-auto resize-none py-2")}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {([
              ["Price £", "price"],
              ["Protein g", "protein"],
              ["Carbs g", "carbs"],
              ["Fat g", "fat"],
              ["kcal", "calories"],
            ] as const).map(([label, key]) => (
              <label key={key} className="flex flex-col gap-1 text-xs font-medium text-muted">
                {label}
                <input
                  type="number"
                  value={m[key] as number}
                  onChange={(e) => set({ [key]: Number(e.target.value) || 0 } as Partial<Meal>)}
                  className={field}
                />
              </label>
            ))}
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Recipe steps (one per line)
            <textarea
              value={recipeText}
              onChange={(e) => setRecipeText(e.target.value)}
              placeholder={"Cook the chicken…\nServe over rice…"}
              className={cn(field, area, "h-auto")}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Education note <span className="text-[10px] text-muted/70">(shown to clients)</span>
            <textarea
              value={m.education ?? ""}
              onChange={(e) => set({ education: e.target.value || null })}
              placeholder="Why this meal works…"
              className={cn(field, area, "h-auto")}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Coach note <span className="text-[10px] text-muted/70">(shown to clients)</span>
            <textarea
              value={m.coachNote ?? ""}
              onChange={(e) => set({ coachNote: e.target.value || null })}
              placeholder="Your tailored tip…"
              className={cn(field, area, "h-auto")}
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={!m.name.trim() || saving}>
            {saving ? "Saving…" : "Save item"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MealManager() {
  const [list, setList] = useState<Meal[] | null>(null);
  const [editing, setEditing] = useState<Meal | null>(null);
  const [visible, setVisible] = useState<boolean | null>(null); // null = still loading
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/meals")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Meal[]) => active && setList(data))
      .catch(() => active && setList([]));
    fetch("/api/meals/visibility")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && d && setVisible(d.visible))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function toggleVisibility() {
    if (visible === null || toggling) return;
    setToggling(true);
    try {
      const res = await fetch("/api/meals/visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !visible }),
      });
      if (res.ok) setVisible((await res.json()).visible);
    } finally {
      setToggling(false);
    }
  }

  function onSaved(saved: Meal) {
    setList((prev) => {
      const cur = prev ?? [];
      return cur.some((x) => x.id === saved.id)
        ? cur.map((x) => (x.id === saved.id ? saved : x))
        : [saved, ...cur];
    });
    setEditing(null);
  }

  async function remove(id: string) {
    await fetch(`/api/meals/${id}`, { method: "DELETE" }).catch(() => {});
    setList((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
  }

  return (
    <div className="space-y-4">
      {/* Client visibility switch - the database stays coach-only until this is on. */}
      <Card
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border p-4",
          visible ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              visible ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
            )}
          >
            {visible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink">
              {visible === null ? "Checking visibility…" : visible ? "Visible to clients" : "Hidden from clients"}
            </div>
            <p className="text-xs text-muted">
              {visible
                ? "Clients can browse the meal database in their nutrition page."
                : "Clients see a “coming soon” note until you switch this on."}
            </p>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={toggleVisibility} disabled={visible === null || toggling}>
          {toggling ? "Saving…" : visible ? "Hide from clients" : "Make visible"}
        </Button>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Your curated meal & snack database - clients browse these by tier.</p>
        <Button size="sm" onClick={() => setEditing(blank)}>
          <Plus className="h-4 w-4" />
          New item
        </Button>
      </div>

      {list === null ? (
        <Card className="p-8 text-center text-muted">Loading meals…</Card>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center text-muted">No meals yet - add your first item.</Card>
      ) : (
        <Card className="divide-y divide-line">
          {list.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-ink">{m.name}</span>
                  <Badge tone="royal">{m.category}</Badge>
                  {m.budget && <span className="text-[11px] font-semibold text-emerald-600">Budget</span>}
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  £{m.price.toFixed(2)} · {m.protein}g P · {m.carbs}g C · {m.fat}g F · {m.calories} kcal
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(m)}
                aria-label={`Edit ${m.name}`}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-royal-50 hover:text-ink"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(m.id)}
                aria-label={`Delete ${m.name}`}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </Card>
      )}

      {editing && <MealForm initial={editing} onSaved={onSaved} onClose={() => setEditing(null)} />}
    </div>
  );
}
