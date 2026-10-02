"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChefHat, MessageSquareQuote, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Card } from "@/components/portal/primitives";
import { tierInfo, type Tier } from "@/lib/nutrition/config";
import type { Meal, MealCategory } from "@/lib/nutrition/types";

const CATEGORIES: ("All" | MealCategory)[] = ["All", "Breakfast", "Lunch", "Dinner", "Snack"];

function Macro({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg px-2 py-1 text-center",
        accent ? "bg-royal-50 text-royal-700" : "bg-paper text-ink",
      )}
    >
      <div className="text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

function MealCard({ meal, tier }: { meal: Meal; tier: Tier }) {
  const depth = tierInfo(tier).mealDepth;
  const [open, setOpen] = useState(false);

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base leading-tight">{meal.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="royal">{meal.category}</Badge>
            {meal.budget && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <Wallet className="h-3 w-3" /> Budget
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg text-ink">£{meal.price.toFixed(2)}</div>
          <div className="text-[10px] text-muted">per serving</div>
        </div>
      </div>

      <p className="mt-2 text-sm text-muted">{meal.description}</p>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <Macro label="Protein" value={`${meal.protein}g`} accent />
        <Macro label="Carbs" value={`${meal.carbs}g`} />
        <Macro label="Fat" value={`${meal.fat}g`} />
        <Macro label="kcal" value={`${meal.calories}`} />
      </div>

      {/* Beginner+: the "why this meal" education */}
      {depth !== "basic" && meal.education && (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-royal-50/60 p-2.5 text-xs leading-relaxed text-royal-800">
          <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {meal.education}
        </p>
      )}

      {/* Performance: coach's tailored guidance */}
      {depth === "tailored" && meal.coachNote && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-gold-100/70 p-2.5 text-xs leading-relaxed text-royal-950">
          <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" />
          <span>
            <span className="font-semibold">My note: </span>
            {meal.coachNote}
          </span>
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm font-medium text-royal-700"
      >
        Recipe
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ol className="mt-2 space-y-1.5 text-sm text-muted">
          {meal.recipe.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-semibold text-royal-600">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function MealIdeas({ tier }: { tier: Tier }) {
  const [cat, setCat] = useState<"All" | MealCategory>("All");
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [hidden, setHidden] = useState(false); // coach hasn't published the database yet
  const depth = tierInfo(tier).mealDepth;

  useEffect(() => {
    let active = true;
    fetch("/api/meals")
      .then(async (r) => {
        if (!active) return;
        if (r.status === 403) {
          setHidden(true);
          setMeals([]);
          return;
        }
        setMeals(r.ok ? await r.json() : []);
      })
      .catch(() => active && setMeals([]));
    return () => {
      active = false;
    };
  }, []);

  if (hidden) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-royal-50 text-royal-600">
          <ChefHat className="h-7 w-7" />
        </div>
        <h3 className="font-display text-xl">Meals coming soon</h3>
        <p className="max-w-sm text-sm text-muted">
          I&apos;m putting your meal &amp; snack ideas together - they&apos;ll appear here once they&apos;re ready.
          In the meantime, use the <span className="font-medium text-ink">Today</span> and{" "}
          <span className="font-medium text-ink">Learn</span> tabs above.
        </p>
      </Card>
    );
  }

  // Plain derivation (deliberately NOT a hook: it sits below the early return
  // above, and a hook here crashes React the moment `hidden` flips).
  const filtered = !meals ? [] : cat === "All" ? meals : meals.filter((m) => m.category === cat);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Coach-curated, budget-friendly ideas with full macros.
          {depth === "educational" && " Each comes with why it works for you."}
          {depth === "tailored" && " Plus my notes tailored to your week."}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                cat === c
                  ? "border-royal-600 bg-royal-600 text-white"
                  : "border-line bg-white text-muted hover:border-royal-300 hover:text-ink",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {meals === null ? (
        <Card className="p-8 text-center text-muted">Loading meals…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted">
          {meals.length === 0 ? "No meals yet - check back soon." : "No meals in this category."}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MealCard key={m.id} meal={m} tier={tier} />
          ))}
        </div>
      )}
    </div>
  );
}
