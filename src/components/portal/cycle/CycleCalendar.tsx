"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addDays,
  monthGrid,
  monthOf,
  phaseOn,
  today as todayKey,
  type CycleProfileLike,
  type Phase,
  PHASE_LABEL,
} from "@/lib/cycle";

export interface CalendarDay {
  date: string;
  flow: string | null;
  symptoms: string[];
  mood: number | null;
  sleepQuality: number | null;
  note: string | null;
}

/** Same colour language as the coach's programming overlay. */
const PHASE_BAR: Record<Phase, string> = {
  menstrual: "bg-red-400",
  follicular: "bg-emerald-400",
  ovulation: "bg-gold-400",
  luteal: "bg-royal-400",
};

const FLOW_FILL: Record<string, string> = {
  light: "bg-red-100 text-red-800",
  medium: "bg-red-300 text-red-950",
  heavy: "bg-red-500 text-white",
};

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Month calendar for cycle tracking. Shows what she logged (filled), what we
 * expect (outlined), and the phase of each day - and lets her open any past day
 * to log it, which is the whole point: forgetting to log on the day is normal.
 */
export function CycleCalendar({
  logs,
  profile,
  predictedPeriod,
  predictedOvulation,
  showPhases,
  readOnly,
  onPickDay,
}: {
  logs: CalendarDay[];
  profile: CycleProfileLike;
  /** Future days we expect her period to cover. */
  predictedPeriod: string[];
  predictedOvulation: string[];
  /** False for contraception where phases would be meaningless. */
  showPhases: boolean;
  /** Coach view: display only, no logging. */
  readOnly?: boolean;
  onPickDay?: (date: string, existing: CalendarDay | null) => void;
}) {
  const today = todayKey();
  const [anchor, setAnchor] = useState(today);
  const { days, monthStart } = monthGrid(anchor);
  const visibleMonth = monthOf(monthStart);

  const byDate = new Map(logs.map((l) => [l.date, l]));
  const periodSet = new Set(predictedPeriod);
  const ovulationSet = new Set(predictedOvulation);
  const bleedRows = logs.map((l) => ({ date: l.date, flow: l.flow }));

  const monthLabel = new Date(`${monthStart}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setAnchor(addDays(monthStart, -1))}
          aria-label="Previous month"
          className="grid h-11 w-11 place-items-center rounded-lg text-muted transition-colors hover:bg-royal-50 hover:text-ink"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-display text-lg text-ink">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setAnchor(addDays(monthStart, 32))}
          aria-label="Next month"
          className="grid h-11 w-11 place-items-center rounded-lg text-muted transition-colors hover:bg-royal-50 hover:text-ink"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW.map((d, i) => (
          <span key={i} className="pb-1 text-[11px] font-semibold uppercase text-muted">
            {d}
          </span>
        ))}

        {days.map((day) => {
          const inMonth = monthOf(day) === visibleMonth;
          const log = byDate.get(day) ?? null;
          const isToday = day === today;
          const isFuture = day > today;
          const phase = showPhases ? phaseOn(profile, bleedRows, day) : null;
          const expectPeriod = isFuture && periodSet.has(day);
          const expectOvulation = isFuture && ovulationSet.has(day);
          const label = Number(day.slice(8));

          return (
            <button
              key={day}
              type="button"
              disabled={isFuture || readOnly}
              onClick={() => onPickDay?.(day, log)}
              aria-label={`${day}${log?.flow ? `, ${log.flow} flow` : ""}${
                phase ? `, ${PHASE_LABEL[phase]} phase` : ""
              }${expectPeriod ? ", period expected" : ""}`}
              className={cn(
                "relative flex min-h-[3rem] flex-col items-center justify-center gap-0.5 rounded-xl border text-sm transition-colors",
                inMonth ? "border-transparent" : "border-transparent opacity-35",
                isFuture || readOnly ? "cursor-default" : "hover:border-royal-300",
                isToday && "ring-2 ring-royal-500",
                log?.flow ? FLOW_FILL[log.flow] ?? "bg-red-200" : "bg-paper",
                expectPeriod && "border-dashed border-red-300 bg-red-50/40",
              )}
            >
              <span className={cn("font-medium tabular-nums", isToday && "font-bold")}>{label}</span>

              {/* Symptom marker */}
              {log && log.symptoms.length > 0 && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-royal-500" />
              )}
              {/* Expected ovulation */}
              {expectOvulation && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-gold-500" />}

              {/* Phase bar - same key as the coach's programming week */}
              {phase && <span className={cn("h-0.5 w-5 rounded-full", PHASE_BAR[phase])} />}
            </button>
          );
        })}
      </div>

      {/* Key */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-300" />
          Logged bleed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-dashed border-red-300 bg-red-50" />
          Period expected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-royal-500" />
          Symptoms logged
        </span>
        {showPhases && (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
              Ovulation expected
            </span>
            {(Object.keys(PHASE_BAR) as Phase[]).map((ph) => (
              <span key={ph} className="inline-flex items-center gap-1.5">
                <span className={cn("h-0.5 w-4 rounded-full", PHASE_BAR[ph])} />
                {PHASE_LABEL[ph]}
              </span>
            ))}
          </>
        )}
      </div>
      {!readOnly && (
        <p className="mt-2 text-xs text-muted">
          Tap any day up to today to log or edit it - handy when you forget on the day.
        </p>
      )}
    </div>
  );
}
