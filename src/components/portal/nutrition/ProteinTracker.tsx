"use client";

import { useState } from "react";
import { ChevronDown, Drumstick, Lock, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/portal/primitives";
import { proteinGoal, tierInfo, type Tier } from "@/lib/nutrition/config";
import type { NutritionLogDTO, NutritionProfileDTO } from "@/lib/nutrition/types";
import { InfoTip } from "./InfoTip";

const numField =
  "h-10 rounded-lg border border-line bg-paper px-3 text-sm text-ink focus:border-royal-400 focus:bg-white focus:outline-none disabled:opacity-70";

function patchGoals(patch: Record<string, number>) {
  fetch("/api/me/nutrition/goals", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).catch(() => {});
}

export function ProteinTracker({
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
  const info = tierInfo(tier);
  const coachLed = info.habitControl === "coach"; // Performance: locked, coach-set

  const [weightKg, setWeightKg] = useState(profile.bodyWeightKg ?? 0);
  const [multiplier, setMultiplier] = useState(profile.proteinMultiplier);
  const [logged, setLogged] = useState(today.protein);
  const [showCalc, setShowCalc] = useState(false);

  // Computed live for instant feedback; the server stores the same formula.
  const goal = weightKg ? proteinGoal(weightKg, multiplier) : 0;
  const pct = goal ? Math.min(100, Math.round((logged / goal) * 100)) : 0;
  const hit = goal > 0 && logged >= goal;

  function logProtein(next: number) {
    const value = Math.max(0, next);
    setLogged(value);
    fetch("/api/me/nutrition/log", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ protein: value, ...(date ? { date } : {}) }),
    }).catch(() => {});
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-royal-50 text-royal-600">
            <Drumstick className="h-5 w-5" />
          </span>
          <div>
            <h3 className="flex items-center gap-1.5 font-display text-lg">
              Daily protein
              <InfoTip text="Protein repairs the muscle you train and keeps you full. Your goal is your bodyweight times a multiplier your coach sets." />
            </h3>
            <p className="text-xs text-muted">
              {coachLed ? (
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" /> {info.habitControlLabel}
                </span>
              ) : (
                info.habitControlLabel
              )}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl text-royal-700">{goal ? `${goal}g` : " -"}</div>
          <div className="text-[11px] text-muted">
            {weightKg ? `${multiplier} g/kg × ${weightKg} kg` : "Set your weight below"}
          </div>
        </div>
      </div>

      {/* Logged vs goal */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="font-medium text-ink">
            {logged}g <span className="text-muted">logged today</span>
          </span>
          <span className={cn("text-xs font-semibold", hit ? "text-emerald-600" : "text-muted")}>
            {!goal ? "Set your weight to see your goal" : hit ? "Goal hit 🎉" : `${goal - logged}g to go`}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-paper">
          <div
            className={cn("h-full rounded-full transition-all", hit ? "bg-emerald-500" : "bg-royal-500")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Quick log:</span>
          {[10, 20, 30].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => logProtein(logged + g)}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink transition-colors hover:border-royal-300 hover:bg-royal-50"
            >
              <Plus className="h-3 w-3" />
              {g}g
            </button>
          ))}
          <button
            type="button"
            onClick={() => logProtein(logged - 10)}
            aria-label="Remove 10g"
            className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-royal-300"
          >
            <Minus className="h-3 w-3" />
            10g
          </button>
        </div>
      </div>

      {/* Calculator */}
      <button
        type="button"
        onClick={() => setShowCalc((v) => !v)}
        className="mt-5 flex w-full items-center justify-between border-t border-line pt-4 text-sm font-medium text-royal-700"
      >
        How your goal is calculated
        <ChevronDown className={cn("h-4 w-4 transition-transform", showCalc && "rotate-180")} />
      </button>

      {showCalc && (
        <div className="mt-4 space-y-4">
          {coachLed && (
            <p className="flex items-center gap-1.5 rounded-xl bg-paper p-3 text-xs text-muted">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Your coach sets these - shown so you understand your number.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted">
              Bodyweight (kg)
              <input
                type="number"
                min={30}
                disabled={coachLed}
                value={weightKg || ""}
                onChange={(e) => {
                  const v = Math.max(0, Number(e.target.value) || 0);
                  setWeightKg(v);
                  patchGoals({ bodyWeightKg: v });
                }}
                className={numField}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted">
              Multiplier (g/kg)
              <input
                type="number"
                min={1}
                max={3}
                step={0.1}
                disabled={coachLed}
                value={multiplier}
                onChange={(e) => {
                  const v = Math.max(0.5, Number(e.target.value) || 0);
                  setMultiplier(v);
                  patchGoals({ proteinMultiplier: v });
                }}
                className={numField}
              />
            </label>
          </div>
          <p className="text-xs text-muted">
            {weightKg} kg × {multiplier} = <span className="font-semibold text-ink">{goal}g protein/day</span>
          </p>
        </div>
      )}
    </Card>
  );
}
