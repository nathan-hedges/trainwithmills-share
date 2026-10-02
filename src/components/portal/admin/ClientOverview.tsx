"use client";

import { CalendarCheck, Dumbbell, TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientAnalytics } from "@/lib/analytics";
import { Badge, Card, StatCard } from "../primitives";
import { ProgressionChart } from "../client/ProgressionChart";
import { ConsistencyChart } from "./ConsistencyChart";
import { ClientNutritionSummary } from "./ClientNutritionSummary";

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const cyclePhaseLabel: Record<string, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulation: "Ovulation",
  luteal: "Luteal",
};

const energyLabels = ["Drained", "Low", "Okay", "Good", "Energised"];
function energyTone(e: number) {
  if (e <= 2) return "bg-amber-500";
  if (e === 3) return "bg-gold-500";
  return "bg-emerald-500";
}

export function ClientOverview({
  firstName,
  unit = "kg",
  analytics,
  clientId,
}: {
  firstName: string;
  unit?: string;
  analytics: ClientAnalytics;
  clientId?: string;
}) {
  const series = analytics.history;
  const weeks = analytics.consistency;
  const recent = analytics.recent;

  const lastWeek = weeks[weeks.length - 1];
  const totalVolume = weeks.reduce((n, w) => n + w.volume, 0);
  const prs = series.reduce((n, s) => {
    let count = 0;
    for (let i = 1; i < s.points.length; i++) {
      if (s.points[i].topWeight > s.points[i - 1].topWeight) count++;
    }
    return n + count;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Adherence" value={`${analytics.adherence}%`} sublabel="last 4 weeks" icon={TrendingUp} />
        <StatCard
          label="This week"
          value={lastWeek ? `${lastWeek.completed}/${lastWeek.planned}` : " -"}
          sublabel="sessions done"
          icon={CalendarCheck}
        />
        <StatCard label="Volume (8 wks)" value={`${totalVolume.toFixed(1)}t`} sublabel="lifted" icon={Dumbbell} />
        <StatCard label="Personal records" value={prs} sublabel="this block" icon={Trophy} tone="gold" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg">Consistency</h3>
              <p className="text-sm text-muted">Sessions completed per week vs target</p>
            </div>
            <span className="flex items-center gap-2 whitespace-nowrap text-xs text-muted">
              <span className="h-2 w-2 rounded-full bg-royal-600" />
              Completed
              <span className="ml-1 inline-block h-2 w-2 rounded-full bg-gold-400" />
              Target
            </span>
          </div>
          <ConsistencyChart weeks={weeks} />
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-lg">Recent sessions &amp; check-ins</h3>
          <p className="text-sm text-muted">How each session felt for {firstName}.</p>
          <div className="mt-3 space-y-2.5">
            {recent.length === 0 && <p className="text-sm text-muted">No completed sessions yet.</p>}
            {recent.map((w) => (
              <div key={w.id} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{w.title}</div>
                    <div className="text-xs text-muted">
                      {fmtDate(w.date)} · {w.exerciseCount} exercises
                    </div>
                  </div>
                  <Badge tone="green">Done</Badge>
                </div>
                {w.checkIn ? (
                  <div className="mt-2.5 border-t border-line pt-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full", energyTone(w.checkIn.energy ?? 0))} />
                        <span className="font-medium text-ink">Energy {w.checkIn.energy ?? w.checkIn.energyBefore}/5</span>
                        <span className="text-xs text-muted">
                          {energyLabels[(w.checkIn.energy ?? w.checkIn.energyBefore ?? 1) - 1]}
                        </span>
                      </span>
                      {w.checkIn.cyclePhase !== "none" && (
                        <Badge tone="royal">{cyclePhaseLabel[w.checkIn.cyclePhase] ?? w.checkIn.cyclePhase}</Badge>
                      )}
                    </div>
                    {w.checkIn.note && (
                      <p className="mt-1 text-xs italic text-muted">&ldquo;{w.checkIn.note}&rdquo;</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted/80">No check-in logged for this session.</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <h3 className="mb-3 font-display text-lg">Strength progression</h3>
        {series.length === 0 ? (
          <Card className="p-8 text-center text-muted">
            No logged lifts yet - progression charts appear once {firstName} starts logging weights.
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {series.map((s) => {
              const data = s.points.map((p) => ({ date: p.date, weight: p.topWeight }));
              const start = data[0]?.weight;
              const current = data[data.length - 1]?.weight;
              const delta =
                start != null && current != null ? Math.round((current - start) * 10) / 10 : null;
              return (
                <Card key={s.exerciseId} className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-display text-base">{s.exerciseName}</h4>
                      <p className="text-xs text-muted">{s.exerciseCategory}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl text-royal-700">
                        {current} {unit}
                      </div>
                      {delta != null && (
                        <Badge tone={delta >= 0 ? "green" : "amber"}>
                          {delta >= 0 ? "+" : ""}
                          {delta} {unit}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressionChart data={data} unit={unit} height={170} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {clientId && (
        <div>
          <h3 className="mb-3 font-display text-lg">Nutrition</h3>
          <ClientNutritionSummary clientId={clientId} />
        </div>
      )}
    </div>
  );
}
