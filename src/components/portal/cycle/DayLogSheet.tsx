"use client";

import { useState } from "react";
import { Droplet, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { SYMPTOMS } from "@/lib/cycle";
import type { CalendarDay } from "./CycleCalendar";

const FLOWS: { value: "light" | "medium" | "heavy"; label: string; dots: number }[] = [
  { value: "light", label: "Light", dots: 1 },
  { value: "medium", label: "Medium", dots: 2 },
  { value: "heavy", label: "Heavy", dots: 3 },
];

const MOODS = ["Awful", "Low", "Okay", "Good", "Great"];
const SLEEPS = ["Terrible", "Poor", "Okay", "Good", "Great"];

export interface DayPayload {
  date: string;
  flow: string | null;
  symptoms: string[];
  mood: number | null;
  sleepQuality: number | null;
  note: string | null;
}

function Scale({
  label,
  labels,
  value,
  onChange,
}: {
  label: string;
  labels: string[];
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-ink">{label}</h3>
      <div className="mt-2 flex gap-1.5">
        {labels.map((l, i) => {
          const v = i + 1;
          const on = value === v;
          return (
            <button
              key={l}
              type="button"
              onClick={() => onChange(on ? null : v)}
              aria-pressed={on}
              className={cn(
                "flex min-h-[2.75rem] flex-1 flex-col items-center justify-center rounded-xl border px-1 text-[11px] transition-colors",
                on ? "border-royal-400 bg-royal-50 font-semibold text-royal-800" : "border-line text-muted hover:bg-paper",
              )}
            >
              <span className="text-sm font-medium">{v}</span>
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Log or edit a single day - reached by tapping any past day on the calendar. */
export function DayLogSheet({
  date,
  existing,
  saving,
  onSave,
  onClose,
}: {
  date: string;
  existing: CalendarDay | null;
  saving: boolean;
  onSave: (payload: DayPayload) => void;
  onClose: () => void;
}) {
  const [flow, setFlow] = useState<string | null>(existing?.flow ?? null);
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [sleep, setSleep] = useState<number | null>(existing?.sleepQuality ?? null);
  const [note, setNote] = useState(existing?.note ?? "");

  const pretty = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  function toggleSymptom(s: string) {
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function submit(clear = false) {
    onSave(
      clear
        ? { date, flow: null, symptoms: [], mood: null, sleepQuality: null, note: null }
        : { date, flow, symptoms, mood, sleepQuality: sleep, note: note.trim() || null },
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/40 backdrop-blur-sm sm:place-items-center" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-elevated sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <h2 className="font-display text-lg text-ink">{pretty}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-11 w-11 place-items-center rounded-full text-muted transition-colors hover:bg-paper hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <h3 className="text-sm font-medium text-ink">Bleeding</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {FLOWS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFlow(flow === f.value ? null : f.value)}
                  aria-pressed={flow === f.value}
                  className={cn(
                    "inline-flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors",
                    flow === f.value ? "border-red-300 bg-red-50 text-red-700" : "border-line text-ink/70 hover:bg-paper",
                  )}
                >
                  <span className="flex gap-0.5">
                    {Array.from({ length: f.dots }).map((_, i) => (
                      <Droplet
                        key={i}
                        className={cn("h-3.5 w-3.5", flow === f.value ? "text-red-500" : "text-muted")}
                      />
                    ))}
                  </span>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-ink">Symptoms</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {SYMPTOMS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSymptom(s)}
                  aria-pressed={symptoms.includes(s)}
                  className={cn(
                    "min-h-[2.5rem] rounded-full border px-3.5 text-sm transition-colors",
                    symptoms.includes(s)
                      ? "border-royal-400 bg-royal-50 font-medium text-royal-800"
                      : "border-line text-ink/70 hover:bg-paper",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Scale label="Mood" labels={MOODS} value={mood} onChange={setMood} />
          <Scale label="Sleep" labels={SLEEPS} value={sleep} onChange={setSleep} />

          <div>
            <h3 className="text-sm font-medium text-ink">Note</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Anything worth remembering?"
              className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15"
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-white px-5 py-4">
          {existing && (
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear day
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => submit()} disabled={saving}>
              {saving ? "Saving…" : "Save day"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
