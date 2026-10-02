"use client";

import { useEffect, useState } from "react";
import { Activity, BookOpen, Sparkles, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Card, PageHeading } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import { tierInfo } from "@/lib/nutrition/config";
import type { NutritionData } from "@/lib/nutrition/types";
import { ProteinTracker } from "@/components/portal/nutrition/ProteinTracker";
import { HabitTracker } from "@/components/portal/nutrition/HabitTracker";
import { WeeklyInsights } from "@/components/portal/nutrition/WeeklyInsights";
import { MealIdeas } from "@/components/portal/nutrition/MealIdeas";
import { LearnSection } from "@/components/portal/nutrition/LearnSection";

const TABS = [
  { id: "today", label: "Today", icon: Activity },
  { id: "meals", label: "Meal ideas", icon: UtensilsCrossed },
  { id: "learn", label: "Learn", icon: BookOpen },
] as const;
type TabId = (typeof TABS)[number]["id"];

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0]; // matches the server's UTC day key
}

export default function NutritionPage() {
  const [data, setData] = useState<NutritionData | null>(null);
  const [tab, setTab] = useState<TabId>("today");
  const [date, setDate] = useState(() => isoDaysAgo(0));

  // Trailing 7 days, oldest first - lets clients backfill a forgotten day.
  const days = Array.from({ length: 7 }, (_, i) => isoDaysAgo(6 - i));
  const todayIso = isoDaysAgo(0);

  useEffect(() => {
    let active = true;
    fetch(`/api/me/nutrition?date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: NutritionData | null) => active && setData(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [date]);

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeading title="Nutrition" subtitle="Protein, habits and meal ideas - tuned to your plan." />
        <Card className="p-8 text-center text-muted">Loading nutrition…</Card>
      </div>
    );
  }

  // No active plan → no nutrition tier, so there's nothing to track yet.
  if (!data.tier) {
    return (
      <div className="space-y-6">
        <PageHeading title="Nutrition" subtitle="Protein, habits and meal ideas - tuned to your plan." />
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Sparkles className="h-7 w-7 text-gold-500" />
          <p className="max-w-sm text-muted">
            You don&apos;t have an active plan yet, so your nutrition space isn&apos;t set up. Get in
            touch with me to choose a plan and unlock your trackers.
          </p>
          <Button href="/contact" size="sm">
            Message me
          </Button>
        </Card>
      </div>
    );
  }

  const { profile, today } = data;
  const tier = data.tier;
  const info = tierInfo(tier);

  return (
    <div className="space-y-6">
      <PageHeading title="Nutrition" subtitle="Protein, habits and meal ideas - tuned to your plan." />

      {/* Your plan decides how much you control (set by your coach). */}
      <Card className="flex items-center gap-2 p-4 text-sm text-muted">
        <Sparkles className="h-4 w-4 shrink-0 text-gold-500" />
        <span>
          You&apos;re on the <span className="font-semibold text-ink">{info.name}</span> plan -{" "}
          {info.habitControlLabel.toLowerCase()}.
        </span>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 rounded-full border border-line bg-white p-1 sm:w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium transition-colors sm:flex-none",
                tab === t.id ? "bg-royal-600 text-white" : "text-muted hover:text-ink",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "today" && (
        <div className="space-y-6">
          {/* Day picker - log today or backfill a forgotten day (up to a week back). */}
          <div className="flex flex-wrap items-center gap-1.5">
            {days.map((d) => {
              const sel = d === date;
              const label =
                d === todayIso
                  ? "Today"
                  : new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDate(d)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                    sel ? "border-royal-600 bg-royal-600 text-white" : "border-line bg-white text-muted hover:border-royal-300 hover:text-ink",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {date !== todayIso && (
            <p className="-mt-3 text-xs text-muted">
              You&apos;re logging for{" "}
              <span className="font-semibold text-ink">
                {new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </span>
              .
            </p>
          )}

          {/* Keyed on the FETCHED day so the trackers remount exactly when the
              right log arrives (never showing one day's numbers under another). */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ProteinTracker key={data.date ?? date} tier={tier} profile={profile} today={today} date={data.date ?? date} />
            <WeeklyInsights />
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="font-display text-xl">Daily habits</h2>
              <Badge tone="neutral">{info.habitControlLabel}</Badge>
            </div>
            <HabitTracker key={data.date ?? date} tier={tier} profile={profile} today={today} date={data.date ?? date} />
          </div>
        </div>
      )}

      {tab === "meals" && <MealIdeas tier={tier} />}

      {tab === "learn" && <LearnSection />}
    </div>
  );
}
