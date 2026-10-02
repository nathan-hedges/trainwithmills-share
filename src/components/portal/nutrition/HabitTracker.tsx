"use client";

import { useState } from "react";
import { Apple, Check, Droplet, Footprints, Lock, Minus, Moon, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/portal/primitives";
import { defaultHabits, tierInfo, type Habit, type HabitId, type Tier } from "@/lib/nutrition/config";
import type { NutritionLogDTO, NutritionProfileDTO } from "@/lib/nutrition/types";
import { InfoTip } from "./InfoTip";

const ICONS: Record<HabitId, LucideIcon> = {
  steps: Footprints,
  sleep: Moon,
  water: Droplet,
  fiveADay: Apple,
};

const COLORS: Record<Habit["color"], { bar: string; chip: string }> = {
  royal: { bar: "bg-royal-500", chip: "bg-royal-50 text-royal-600" },
  violet: { bar: "bg-violet-500", chip: "bg-violet-50 text-violet-600" },
  sky: { bar: "bg-sky-500", chip: "bg-sky-50 text-sky-600" },
  emerald: { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-600" },
};

function fmt(h: Habit, value: number) {
  if (h.id === "steps") return value.toLocaleString();
  return `${value % 1 === 0 ? value : value.toFixed(2).replace(/0$/, "")}${h.unit}`;
}

function patch(path: "log" | "goals", body: Record<string, number | string>) {
  fetch(`/api/me/nutrition/${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

function HabitCard({
  habit,
  tier,
  initialValue,
  initialGoal,
  date,
}: {
  habit: Habit;
  tier: Tier;
  initialValue: number;
  initialGoal: number;
  date?: string;
}) {
  const coachLed = tierInfo(tier).habitControl === "coach";
  const Icon = ICONS[habit.id];
  const color = COLORS[habit.color];

  const [value, setValue] = useState(initialValue);
  const [goal, setGoal] = useState(initialGoal);

  const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  const done = goal > 0 && value >= goal;

  function logValue(next: number) {
    const v = Math.max(0, Math.round(next * 100) / 100);
    setValue(v);
    patch("log", { [habit.id]: v, ...(date ? { date } : {}) });
  }

  function saveGoal(next: number) {
    const g = Math.max(habit.step, Math.round(next * 100) / 100);
    setGoal(g);
    patch("goals", { [`${habit.id}Goal`]: g });
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("grid h-9 w-9 place-items-center rounded-xl", color.chip)}>
            <Icon className="h-5 w-5" />
          </span>
          <span className="flex items-center gap-1 font-medium text-ink">
            {habit.label}
            <InfoTip text={habit.why} />
          </span>
        </div>
        {done && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <Check className="h-3 w-3" /> Done
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-2xl text-ink">{fmt(habit, value)}</span>
        <span className="text-sm text-muted">/ {fmt(habit, goal)}</span>
      </div>

      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-paper">
        <div className={cn("h-full rounded-full transition-all", color.bar)} style={{ width: `${pct}%` }} />
      </div>

      {/* Log today's value */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => logValue(value - habit.step)}
          aria-label={`Decrease ${habit.label}`}
          className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-royal-300 hover:text-ink"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="flex-1 text-center text-xs text-muted">Log {habit.label.toLowerCase()}</span>
        <button
          type="button"
          onClick={() => logValue(value + habit.step)}
          aria-label={`Increase ${habit.label}`}
          className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-royal-300 hover:text-ink"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Goal control - editable on client/shared tiers, locked on coach-led */}
      <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-xs">
        <span className="text-muted">Goal: {fmt(habit, goal)}</span>
        {coachLed ? (
          <span className="inline-flex items-center gap-1 text-muted">
            <Lock className="h-3 w-3" /> Set by me
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => saveGoal(goal - habit.step)}
              aria-label="Lower goal"
              className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-paper hover:text-ink"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => saveGoal(goal + habit.step)}
              aria-label="Raise goal"
              className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-paper hover:text-ink"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>
    </Card>
  );
}

export function HabitTracker({
  tier,
  profile,
  today,
  date,
}: {
  tier: Tier;
  profile: NutritionProfileDTO;
  today: NutritionLogDTO;
  /** Which day is being logged (YYYY-MM-DD). Omitted = today. */
  date?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {defaultHabits.map((h) => (
        <HabitCard
          key={h.id}
          habit={h}
          tier={tier}
          date={date}
          initialValue={today[h.id]}
          initialGoal={profile[`${h.id}Goal`]}
        />
      ))}
    </div>
  );
}
