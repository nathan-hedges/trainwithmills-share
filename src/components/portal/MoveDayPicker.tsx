"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MoveDayOption {
  /** What the caller gets back (an ISO date in programming, a dow in templates). */
  value: string;
  label: string; // "Mon"
  sub?: string; // e.g. the date number
  occupied: boolean; // target already has a session → picking it swaps
  current: boolean; // the day being moved (disabled)
}

/** Small modal: pick where a session should go. Occupied days swap, empty days move. */
export function MoveDayPicker({
  title,
  options,
  onPick,
  onClose,
}: {
  title: string;
  options: MoveDayOption[];
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-white shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-display text-lg">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted">
            Pick a day. Days with a session <span className="font-medium text-ink">swap</span>; empty days just{" "}
            <span className="font-medium text-ink">move</span>.
          </p>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                disabled={o.current}
                onClick={() => onPick(o.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border py-2.5 text-sm transition-colors",
                  o.current
                    ? "cursor-default border-royal-600 bg-royal-600 text-white"
                    : "border-line bg-white hover:border-royal-300",
                )}
              >
                <span className={cn("text-[10px] font-medium uppercase", o.current ? "text-white/70" : "text-muted")}>
                  {o.label}
                </span>
                {o.sub && <span className="font-display text-base">{o.sub}</span>}
                <span
                  className={cn(
                    "text-[9px] font-semibold uppercase tracking-wide",
                    o.current ? "text-white/70" : o.occupied ? "text-amber-600" : "text-emerald-600",
                  )}
                >
                  {o.current ? "Here" : o.occupied ? "Swap" : "Move"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
