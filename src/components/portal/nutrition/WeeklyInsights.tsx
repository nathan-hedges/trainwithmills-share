"use client";

import { useEffect, useState } from "react";
import { BarChart3, GraduationCap, Sparkles, TrendingUp } from "lucide-react";
import { Card } from "@/components/portal/primitives";
import { tierInfo } from "@/lib/nutrition/config";
import { STANDARD_INSIGHTS } from "@/lib/nutrition/insightTemplates";
import type { ClientInsights } from "@/lib/nutrition/types";

function fmtSteps(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

function deltaNote(d: number) {
  if (d > 2) return { text: `+${d}% on last week`, cls: "text-emerald-600" };
  if (d < -2) return { text: `${d}% on last week`, cls: "text-amber-600" };
  return { text: "steady", cls: "text-muted" };
}

export function WeeklyInsights() {
  const [data, setData] = useState<ClientInsights | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/me/nutrition/insights")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ClientInsights | null) => active && setData(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!data || !data.tier) return <Card className="p-5 text-sm text-muted">Loading insights…</Card>;

  const { analytics: a } = data;
  const level = tierInfo(data.tier).analytics;

  if (level === "basic") {
    return (
      <Card className="p-5">
        <h3 className="font-display text-lg">This week at a glance</h3>
        <p className="text-sm text-muted">A simple snapshot of your daily habits.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          {[
            { label: "Days logged", value: `${a.daysLogged}/7` },
            { label: "Protein hit", value: `${a.proteinHitDays} day${a.proteinHitDays === 1 ? "" : "s"}` },
            { label: "Avg steps", value: fmtSteps(a.avgSteps) },
            { label: "Avg sleep", value: `${a.avgSleep}h` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-paper p-3">
              <div className="font-display text-xl text-royal-700">{s.value}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (level === "trends") {
    const rows = [
      { label: "Protein goal", stat: a.protein },
      { label: "Steps goal", stat: a.steps },
      { label: "Sleep goal", stat: a.sleep },
    ];
    return (
      <Card className="p-5">
        <h3 className="flex items-center gap-2 font-display text-lg">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          Your trends
        </h3>
        <p className="text-sm text-muted">Goal completion and how this week compares to last.</p>
        <div className="mt-4 space-y-3">
          {rows.map((r) => {
            const note = deltaNote(r.stat.deltaVsLastWeek);
            return (
              <div key={r.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{r.label}</span>
                  <span className={`text-xs ${note.cls}`}>{note.text}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-paper">
                  <div className="h-full rounded-full bg-royal-500" style={{ width: `${r.stat.pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  // advanced (Performance) -three layers: Millie's personal notes, data-driven
  // insights from your logs, and the standard coaching tips.
  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-display text-lg">
        <Sparkles className="h-5 w-5 text-gold-500" />
        Insights
      </h3>
      <p className="text-sm text-muted">What&apos;s working, what to tweak, and tips from me.</p>

      {data.notes.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gold-600">
            <Sparkles className="h-3.5 w-3.5" /> From me
          </p>
          <div className="space-y-2 text-sm">
            {data.notes.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-gold-300 bg-gold-100/50 p-3 text-royal-950"
              >
                {n.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {a.suggestions.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-royal-600">
            <BarChart3 className="h-3.5 w-3.5" /> From your data
          </p>
          <div className="space-y-2 text-sm">
            {a.suggestions.map((s) => (
              <div key={s} className="rounded-xl border border-royal-100 bg-royal-50/60 p-3 text-royal-900">
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <GraduationCap className="h-3.5 w-3.5" /> Coaching tips
        </p>
        <div className="space-y-2 text-sm">
          {STANDARD_INSIGHTS.map((t) => (
            <div key={t} className="rounded-xl border border-line bg-paper p-3 text-ink">
              {t}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
