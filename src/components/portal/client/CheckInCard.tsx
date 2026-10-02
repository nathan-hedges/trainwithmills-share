"use client";

import { useState } from "react";
import { Check, HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "../primitives";

export interface CheckInData {
  energy: number;
  note: string | null;
}

const energyLabels = ["Drained", "Low", "Okay", "Good", "Energised"];
/**
 * The AFTER-session check-in: how she feels now, plus a note. Cycle phase is
 * captured before the session instead (see PreWorkoutCheckIn), so it isn't
 * asked twice.
 */
export function CheckInCard({
  checkIn,
  readOnly,
  onSave,
}: {
  checkIn?: CheckInData | null;
  readOnly?: boolean;
  onSave: (data: CheckInData) => Promise<void> | void;
}) {
  const [energy, setEnergy] = useState(checkIn?.energy ?? 0);
  const [note, setNote] = useState(checkIn?.note ?? "");
  const [saved, setSaved] = useState(Boolean(checkIn?.energy));
  const [saving, setSaving] = useState(false);

  /** Saves itself - tapping an energy level or leaving the note is enough. */
  async function save(next: { energy?: number; note?: string }) {
    const value = next.energy ?? energy;
    if (value === 0 || readOnly || saving) return;
    setSaving(true);
    try {
      await onSave({ energy: value, note: (next.note ?? note).trim() || null });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-lg">
          <HeartPulse className="h-5 w-5 text-royal-600" />
          How do you feel now?
        </h3>
        {saving ? (
          <span className="text-sm text-muted">Saving…</span>
        ) : saved ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" />
            Saved
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted">
        Saves as you tap - it helps me tailor your training.
      </p>

      <div className="mt-4">
        <span className="text-sm font-medium text-ink">Energy</span>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={readOnly}
              aria-label={`Energy ${n} - ${energyLabels[n - 1]}`}
              aria-pressed={energy === n}
              onClick={() => {
                setEnergy(n);
                save({ energy: n });
              }}
              className={cn(
                "grid h-11 flex-1 cursor-pointer place-items-center rounded-xl border text-sm font-semibold transition-colors disabled:cursor-default",
                energy === n
                  ? "border-royal-600 bg-royal-600 text-white"
                  : "border-line bg-white text-ink hover:border-royal-300",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {energy > 0 ? energyLabels[energy - 1] : "Tap to rate your energy (1–5)"}
        </p>
      </div>

      <div className="mt-4">
        <label htmlFor="checkin-note" className="text-sm font-medium text-ink">
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="checkin-note"
          value={note}
          disabled={readOnly}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => energy > 0 && save({ note })}
          placeholder="Sleep, soreness, mood…"
          className="mt-1.5 h-11 w-full rounded-xl border border-line bg-paper px-3.5 text-sm text-ink transition-colors placeholder:text-muted/60 focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-royal-500/10 disabled:opacity-60"
        />
      </div>
    </Card>
  );
}
