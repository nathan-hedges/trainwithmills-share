"use client";

import { useEffect, useState } from "react";
import { Sliders, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import type { GoalSet, NutritionLogsDTO } from "@/lib/nutrition/types";

const METRICS: { key: keyof GoalSet; label: string; unit: string }[] = [
  { key: "protein", label: "Protein", unit: "g" },
  { key: "steps", label: "Steps", unit: "" },
  { key: "sleep", label: "Sleep", unit: "h" },
  { key: "water", label: "Water", unit: "L" },
  { key: "fiveADay", label: "5-a-day", unit: "" },
];

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const fmtVal = (key: keyof GoalSet, v: number) => (key === "steps" ? v.toLocaleString() : `${v}`);

/** Coach drill-down: a read-only look at what a client has logged recently
 *  (protein + the four habits) against their goals. */
export function ClientNutritionLog({
  client,
  onClose,
}: {
  client: { id: string; name: string };
  onClose: () => void;
}) {
  const [data, setData] = useState<NutritionLogsDTO | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/clients/${client.id}/nutrition/logs`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: NutritionLogsDTO | null) => active && setData(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [client.id]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <Card className="max-h-[90dvh] w-full max-w-lg overflow-y-auto p-5">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg">{client.name}</h3>
              <p className="text-xs text-muted">What they&apos;ve logged recently.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button href={`/admin/clients/${client.id}#nutrition`} size="sm" variant="secondary">
                <Sliders className="h-4 w-4" />
                Set targets
              </Button>
              <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {!data ? (
            <p className="py-10 text-center text-sm text-muted">Loading…</p>
          ) : data.logs.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Nothing logged in the last 3 weeks.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.logs.map((d) => (
                <div key={d.id} className="rounded-xl border border-line p-3">
                  <div className="text-sm font-medium text-ink">{fmtDate(d.date)}</div>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {METRICS.map((m) => {
                      const val = d[m.key];
                      const goal = data.goals[m.key];
                      const hit = goal > 0 && val >= goal;
                      const logged = val > 0;
                      return (
                        <div
                          key={m.key}
                          className={cn("rounded-lg p-2 text-center", hit ? "bg-emerald-50" : "bg-paper")}
                        >
                          <div className="text-[10px] uppercase tracking-wide text-muted">{m.label}</div>
                          <div className={cn("text-sm font-semibold", logged ? "text-ink" : "text-muted/40")}>
                            {logged ? `${fmtVal(m.key, val)}${m.unit}` : " -"}
                          </div>
                          <div className="text-[10px] text-muted">
                            / {fmtVal(m.key, goal)}
                            {m.unit}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
