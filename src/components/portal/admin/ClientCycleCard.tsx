"use client";

import { useEffect, useState } from "react";
import { CalendarHeart, Lock } from "lucide-react";
import { Badge, Card } from "../primitives";
import { CycleCalendar, type CalendarDay } from "../cycle/CycleCalendar";
import { PHASE_LABEL, type Phase } from "@/lib/cycle";

interface Snapshot {
  status: "not-set-up" | "awaiting-consent" | "private" | "active";
  setup?: {
    contraception: string;
    contraceptionLabel: string;
    avgCycleLength: number;
    avgPeriodLength: number;
    predicts: boolean;
    shareLevel: string;
  };
  prediction?: {
    predicts: boolean;
    cycleDay: number | null;
    phase: Phase | null;
    cycleLength: number;
    fromHerData: boolean;
    daysUntilNextPeriod: number | null;
    concern: "none" | "no-period-90" | "long-bleed";
  };
  energyByPhase?: { phase: Phase; average: number; sessions: number }[];
  logs?: CalendarDay[];
  predictedPeriod?: string[];
  predictedOvulation?: string[];
}

/**
 * The coach's read-only view of a client's cycle. What's visible here is the
 * CLIENT's choice - "minimal" strips symptoms and notes server-side.
 */
export function ClientCycleCard({ clientId }: { clientId: string }) {
  const [data, setData] = useState<Snapshot | null>(null);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/cycle`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Snapshot | null) => setData(d))
      .catch(() => {});
  }, [clientId]);

  if (!data || data.status === "not-set-up") return null;

  if (data.status === "private") {
    return (
      <Card className="p-5">
        <h3 className="flex items-center gap-2 font-display text-lg">
          <CalendarHeart className="h-5 w-5 text-royal-600" />
          Cycle tracking
        </h3>
        <p className="mt-2 flex items-start gap-2 text-sm text-muted">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          She&apos;s tracking privately - none of it is shared with you, by her choice. If it would help her training,
          it&apos;s worth a conversation rather than a setting.
        </p>
      </Card>
    );
  }

  if (data.status === "awaiting-consent") {
    return (
      <Card className="p-5">
        <h3 className="flex items-center gap-2 font-display text-lg">
          <CalendarHeart className="h-5 w-5 text-royal-600" />
          Cycle tracking
        </h3>
        <p className="mt-2 text-sm text-muted">
          Set up and waiting for her to opt in - nothing is stored until she does.
        </p>
      </Card>
    );
  }

  const p = data.prediction!;
  const full = data.setup?.shareLevel === "full";

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 font-display text-lg">
          <CalendarHeart className="h-5 w-5 text-royal-600" />
          Cycle
        </h3>
        {p.phase && <Badge tone="royal">{PHASE_LABEL[p.phase]}</Badge>}
        {!full && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted">
            <Lock className="h-3 w-3" />
            Sharing basics only
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1 text-sm text-muted">
        {p.predicts ? (
          <>
            <p>
              {p.cycleDay ? (
                <>
                  <span className="font-medium text-ink">Day {p.cycleDay}</span> of roughly {p.cycleLength}
                  {p.fromHerData ? " (from her logs)" : " (estimate - not enough logs yet)"}
                </>
              ) : (
                "No period logged yet."
              )}
            </p>
            {p.daysUntilNextPeriod != null && p.daysUntilNextPeriod >= 0 && (
              <p>Next period expected in {p.daysUntilNextPeriod} days.</p>
            )}
          </>
        ) : (
          <p>{data.setup?.contraceptionLabel} - bleeds and symptoms only, no phase predictions.</p>
        )}
      </div>

      {(data.energyByPhase?.length ?? 0) > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Her energy by phase</h4>
          <ul className="mt-2 space-y-1.5">
            {data.energyByPhase!.map((e) => (
              <li key={e.phase} className="flex items-center gap-2 text-sm">
                <span className="w-20 shrink-0 text-ink">{PHASE_LABEL[e.phase]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-royal-500" style={{ width: `${(e.average / 5) * 100}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right tabular-nums text-muted">
                  {e.average}/5 · {e.sessions}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(data.logs?.length ?? 0) > 0 && data.setup && (
        <div className="mt-5 border-t border-line pt-4">
          <CycleCalendar
            logs={data.logs!}
            profile={{
              contraception: data.setup.contraception,
              avgCycleLength: data.setup.avgCycleLength,
              avgPeriodLength: data.setup.avgPeriodLength,
            }}
            predictedPeriod={data.predictedPeriod ?? []}
            predictedOvulation={data.predictedOvulation ?? []}
            showPhases={data.setup.predicts}
            readOnly
          />
          {!full && (
            <p className="mt-2 text-xs text-muted">
              She&apos;s sharing the basics, so symptom markers and notes aren&apos;t shown.
            </p>
          )}
        </div>
      )}

    </Card>
  );
}
