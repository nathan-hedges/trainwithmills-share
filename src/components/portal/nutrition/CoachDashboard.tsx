"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, TrendingDown, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/Placeholder";
import { Badge, Card, StatCard } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import { complianceTone, HABIT_META, TIERS, type Tier } from "@/lib/nutrition/config";
import type { NutritionOverviewRow } from "@/lib/nutrition/types";
import { ClientNutritionLog } from "./ClientNutritionLog";

const TIER_TONE: Record<Tier, string> = {
  student: "neutral",
  beginner: "royal",
  performance: "gold",
};

function MiniBar({ pct }: { pct: number }) {
  const tone = complianceTone(pct);
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-full max-w-[64px] overflow-hidden rounded-full bg-paper">
        <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("w-8 text-right text-xs font-medium tabular-nums", tone.text)}>{pct}%</span>
    </div>
  );
}

function Trend({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-amber-600" />;
  return <Minus className="h-4 w-4 text-muted" />;
}

export function CoachDashboard() {
  const [tier, setTier] = useState<"all" | Tier>("all");
  const [clients, setClients] = useState<NutritionOverviewRow[] | null>(null);
  const [detail, setDetail] = useState<NutritionOverviewRow | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/nutrition/overview")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: NutritionOverviewRow[]) => active && setClients(data))
      .catch(() => active && setClients([]));
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(
    () => (!clients ? [] : tier === "all" ? clients : clients.filter((c) => c.tier === tier)),
    [clients, tier],
  );

  if (!clients) return <Card className="p-8 text-center text-muted">Loading clients…</Card>;
  if (clients.length === 0)
    return <Card className="p-8 text-center text-muted">No clients yet.</Card>;

  const avgProtein = Math.round(
    clients.reduce((n, c) => n + c.proteinCompliance, 0) / clients.length,
  );
  const onTrack = clients.filter((c) => c.proteinCompliance >= 80).length;
  const needsAttention = clients.filter((c) => c.proteinCompliance < 55).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Avg protein compliance" value={`${avgProtein}%`} sublabel="this week" icon={TrendingUp} tone="gold" />
        <StatCard label="On track" value={onTrack} sublabel={`of ${clients.length} clients`} icon={Users} />
        <StatCard label="Needs attention" value={needsAttention} sublabel="below 55%" icon={TrendingDown} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["all", ...TIERS.map((t) => t.id)] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTier(t)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              tier === t
                ? "border-royal-600 bg-royal-600 text-white"
                : "border-line bg-white text-muted hover:border-royal-300 hover:text-ink",
            )}
          >
            {t === "all" ? "All tiers" : t}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {/* Desktop */}
        <table className="hidden w-full text-sm lg:table">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3">Protein</th>
              {HABIT_META.map((h) => (
                <th key={h.id} className="px-3 py-3">{h.label}</th>
              ))}
              <th className="px-3 py-3">Trend</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                onClick={() => setDetail(c)}
                className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-royal-50/40"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar initials={c.initials} className="h-9 w-9 text-xs" />
                    <div>
                      <div className="font-medium text-ink">{c.name}</div>
                      <Badge tone={TIER_TONE[c.tier]}>{c.tier}</Badge>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3"><MiniBar pct={c.proteinCompliance} /></td>
                {HABIT_META.map((h) => (
                  <td key={h.id} className="px-3 py-3"><MiniBar pct={c.habits[h.id]} /></td>
                ))}
                <td className="px-3 py-3"><Trend trend={c.trend} /></td>
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <Button href={`/admin/clients/${c.id}#nutrition`} size="sm" variant="secondary">
                    Set targets
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile */}
        <div className="divide-y divide-line lg:hidden">
          {rows.map((c) => (
            <div key={c.id} onClick={() => setDetail(c)} className="cursor-pointer p-4">
              <div className="flex items-center gap-3">
                <Avatar initials={c.initials} className="h-10 w-10 text-sm" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">{c.name}</span>
                    <Trend trend={c.trend} />
                  </div>
                  <Badge tone={TIER_TONE[c.tier]}>{c.tier}</Badge>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="w-16 text-xs text-muted">Protein</span>
                  <MiniBar pct={c.proteinCompliance} />
                </div>
                {HABIT_META.map((h) => (
                  <div key={h.id} className="flex items-center justify-between gap-3">
                    <span className="w-16 text-xs text-muted">{h.label}</span>
                    <MiniBar pct={c.habits[h.id]} />
                  </div>
                ))}
              </div>
              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                <Button href={`/admin/clients/${c.id}#nutrition`} size="sm" variant="secondary" className="w-full">
                  Set targets
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {detail && (
        <ClientNutritionLog
          client={{ id: detail.id, name: detail.name }}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
