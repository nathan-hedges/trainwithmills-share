"use client";

import { useState } from "react";
import { HeartPulse, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { PHASE_LABEL, type Phase } from "@/lib/cycle";

const energyLabels = ["Drained", "Low", "Okay", "Good", "Energised"];
const PHASES: Phase[] = ["menstrual", "follicular", "ovulation", "luteal"];

export interface PreCheckIn {
  energyBefore: number;
  cyclePhase: string;
}

/**
 * Asked as she starts a session: how she's feeling, and where she is in her
 * cycle. The cycle row only appears for clients who actually track it - for
 * everyone else there is no mention of cycles at all.
 */
export function PreWorkoutCheckIn({
  tracksCycle,
  suggestedPhase,
  guidance,
  onSave,
  onSkip,
}: {
  tracksCycle: boolean;
  /** Predicted phase from her tracking - preselected, still editable. */
  suggestedPhase?: string | null;
  /** Millie's training note for whichever phase is selected, if she wrote one. */
  guidance?: { phase: string; training: string }[];
  onSave: (data: PreCheckIn) => Promise<void> | void;
  onSkip: () => void;
}) {
  const [energy, setEnergy] = useState(0);
  const [phase, setPhase] = useState(suggestedPhase ?? "none");
  const [saving, setSaving] = useState(false);

  const phaseNote = guidance?.find((g) => g.phase === phase)?.training?.trim() || null;

  async function save() {
    if (energy === 0 || saving) return;
    setSaving(true);
    try {
      await onSave({ energyBefore: energy, cyclePhase: tracksCycle ? phase : "none" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h2 className="flex items-center gap-2 font-display text-2xl">
        <HeartPulse className="h-6 w-6 text-royal-600" />
        Before you start
      </h2>
      <p className="mt-1.5 text-sm text-muted">
        Quick one - it helps me see how your training lines up with how you actually feel.
      </p>

      <h3 className="mt-6 text-sm font-medium text-ink">How&apos;s your energy right now?</h3>
      <div className="mt-2 flex gap-1.5">
        {energyLabels.map((label, i) => {
          const value = i + 1;
          const on = energy === value;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setEnergy(value)}
              aria-pressed={on}
              className={cn(
                "flex min-h-[4rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 text-[11px] transition-colors",
                on ? "border-royal-400 bg-royal-50 font-semibold text-royal-800" : "border-line text-muted hover:bg-paper",
              )}
            >
              <span className="font-display text-lg">{value}</span>
              {label}
            </button>
          );
        })}
      </div>

      {tracksCycle && (
        <>
          <h3 className="mt-6 text-sm font-medium text-ink">
            Where are you in your cycle?
            {suggestedPhase && <span className="ml-1.5 font-normal text-muted">(we&apos;ve guessed from your tracking)</span>}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {PHASES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPhase(p)}
                aria-pressed={phase === p}
                className={cn(
                  "min-h-[2.75rem] rounded-full border px-4 text-sm transition-colors",
                  phase === p
                    ? "border-royal-400 bg-royal-50 font-medium text-royal-800"
                    : "border-line text-ink/70 hover:bg-paper",
                )}
              >
                {PHASE_LABEL[p]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPhase("none")}
              aria-pressed={phase === "none"}
              className={cn(
                "min-h-[2.75rem] rounded-full border px-4 text-sm transition-colors",
                phase === "none"
                  ? "border-royal-400 bg-royal-50 font-medium text-royal-800"
                  : "border-line text-ink/70 hover:bg-paper",
              )}
            >
              Not sure
            </button>
          </div>
        </>
      )}

      {/* My training note for this phase - the reason we asked. */}
      {tracksCycle && phaseNote && (
        <div className="mt-5 rounded-xl border border-gold-500/30 bg-gold-100/40 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Sparkles className="h-4 w-4 text-gold-600" />
            Training in your {PHASE_LABEL[phase as Phase]?.toLowerCase()} phase
          </h3>
          <p className="mt-1.5 whitespace-pre-line text-sm text-ink/80">{phaseNote}</p>
          <p className="mt-2 text-xs text-muted">Go by how you actually feel today.</p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={save} size="lg" disabled={energy === 0 || saving}>
          {saving ? "Saving…" : "Start training"}
        </Button>
        <Button onClick={onSkip} size="lg" variant="secondary">
          Skip
        </Button>
      </div>
    </div>
  );
}
