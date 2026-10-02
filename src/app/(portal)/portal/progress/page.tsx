"use client";

import { useEffect, useState } from "react";
import { Dumbbell, Flame, TrendingUp, Trophy } from "lucide-react";
import { Badge, Card, PageHeading, StatCard } from "@/components/portal/primitives";
import { ProgressionChart } from "@/components/portal/client/ProgressionChart";
import type { ClientAnalytics } from "@/lib/analytics";

export default function ProgressPage() {
  
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch("/api/me/analytics");
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error("Failed to load analytics:", error);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeading title="Your progress" subtitle="Strength trends across your key lifts." />
        <Card className="p-8 text-center text-muted">Loading your progress data...</Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <PageHeading title="Your progress" subtitle="Strength trends across your key lifts." />
        <Card className="p-8 text-center text-red-500">Failed to load analytics.</Card>
      </div>
    );
  }

  // completed sessions over the 8 tracked weeks (a count)
  const sessionsLogged = analytics.consistency.reduce((n, w) => n + w.completed, 0);
  // w.volume is already in tonnes, so just sum it - no /1000
  const totalVolume = analytics.consistency.reduce((n, w) => n + w.volume, 0).toFixed(1);
  const personalRecords = analytics.history.reduce((n, s) => {
    let prs = 0;
    for (let i = 1; i < s.points.length; i++) {
      if (s.points[i].topWeight > s.points[i - 1].topWeight) prs++;
    }
    return n + prs;
  }, 0);

  const liftsTracked = analytics.history.length;

  const unit = "kg";

  return (
    <div className="space-y-6">
      <PageHeading title="Your progress" subtitle="Strength trends across your key lifts." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sessions logged" value={sessionsLogged.toString()} sublabel="last 8 weeks" icon={Flame} />
        <StatCard label="Total volume" value={`${totalVolume}t`} sublabel="this block" icon={Dumbbell} />
        <StatCard label="Personal records" value={personalRecords.toString()} sublabel="all time" icon={Trophy} tone="gold" />
        <StatCard label="Lifts tracked" value={liftsTracked.toString()} sublabel="with history" icon={TrendingUp} />
      </div>

      {analytics.history.length === 0 ? (
        <Card className="p-8 text-center text-muted">
          No lift history found. Complete some workouts to see your progress charts!
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {analytics.history.map((s) => {
            const data = s.points.map((p) => ({ date: p.date, weight: p.topWeight }));
            
            const start = data[0]?.weight;
            const current = data[data.length - 1]?.weight;
            const delta = start != null && current != null ? Math.round((current - start) * 10) / 10 : null;
          return (
            <Card key={s.exerciseId} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg">{s.exerciseName}</h3>
                  <p className="text-sm text-muted">{s.exerciseCategory}</p>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl text-royal-700">
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
              <div className="mt-4">
                <ProgressionChart data={data} unit={unit} height={200} />
              </div>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
}
