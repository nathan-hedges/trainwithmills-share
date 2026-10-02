"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/portal/primitives";
import { complianceTone } from "@/lib/nutrition/config";
import type { CoachInsights } from "@/lib/nutrition/types";

function Row({ label, pct, delta }: { label: string; pct: number; delta: number }) {
  const tone = complianceTone(pct);
  const deltaCls = delta > 2 ? "text-emerald-600" : delta < -2 ? "text-amber-600" : "text-muted";
  const deltaText = delta > 2 ? `+${delta}%` : delta < -2 ? `${delta}%` : "steady";
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
        <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("w-9 text-right text-xs font-medium tabular-nums", tone.text)}>{pct}%</span>
      <span className={cn("w-16 text-right text-[11px]", deltaCls)}>{deltaText}</span>
    </div>
  );
}

/** Read-only nutrition snapshot for the coach's Overview tab: this week's
 *  compliance + the same insight notes the client sees. */
export function ClientNutritionSummary({ clientId }: { clientId: string }) {
  const [ins, setIns] = useState<CoachInsights | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/clients/${clientId}/nutrition/insights`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: CoachInsights | null) => active && setIns(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [clientId]);

  if (!ins) return null;
  const a = ins.analytics;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2">
        <h3 className="flex items-center gap-2 font-display text-lg">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          Nutrition this week
        </h3>
        <p className="text-sm text-muted">
          Logged {a.daysLogged}/7 days · goal completion vs last week.
        </p>
        <div className="mt-4 space-y-2.5">
          <Row label="Protein" pct={a.protein.pct} delta={a.protein.deltaVsLastWeek} />
          <Row label="Steps" pct={a.steps.pct} delta={a.steps.deltaVsLastWeek} />
          <Row label="Sleep" pct={a.sleep.pct} delta={a.sleep.deltaVsLastWeek} />
          <Row label="Water" pct={a.water.pct} delta={a.water.deltaVsLastWeek} />
          <Row label="5-a-day" pct={a.fiveADay.pct} delta={a.fiveADay.deltaVsLastWeek} />
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="flex items-center gap-2 font-display text-lg">
          <Sparkles className="h-5 w-5 text-gold-500" />
          Insights
        </h3>
        {ins.notes.length === 0 && a.suggestions.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No insights yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {ins.notes.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-gold-300 bg-gold-100/50 p-2.5 text-sm text-royal-950"
              >
                {n.text}
              </div>
            ))}
            {a.suggestions.map((s) => (
              <div
                key={s}
                className="rounded-xl border border-royal-100 bg-royal-50/60 p-2.5 text-sm text-royal-900"
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
