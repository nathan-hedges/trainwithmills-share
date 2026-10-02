"use client";

import { useEffect, useState } from "react";
import { CalendarHeart, Check, ChevronDown } from "lucide-react";
import { Badge, Card } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { PHASE_LABEL, type Phase } from "@/lib/cycle";

interface Row {
  phase: Phase;
  training: string;
  written: boolean;
}

/**
 * Millie's training guidance for each cycle phase. Lives in Settings because
 * it's written once and edited rarely - it doesn't warrant its own page.
 * Clients see the phase they're currently in, on their cycle page and as they
 * start a session. Phases she hasn't written show nothing at all.
 */
export function CycleGuidanceSetting() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [savingPhase, setSavingPhase] = useState<string | null>(null);
  const [savedPhase, setSavedPhase] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cycle-guidance")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Row[]) => setRows(d))
      .catch(() => {});
  }, []);

  function edit(phase: Phase, value: string) {
    setRows((prev) => prev.map((r) => (r.phase === phase ? { ...r, training: value } : r)));
    setSavedPhase(null);
  }

  async function save(row: Row) {
    setSavingPhase(row.phase);
    try {
      const res = await fetch("/api/cycle-guidance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: row.phase, training: row.training }),
      });
      if (res.ok) {
        setRows((prev) =>
          prev.map((r) => (r.phase === row.phase ? { ...r, written: Boolean(r.training.trim()) } : r)),
        );
        setSavedPhase(row.phase);
      }
    } finally {
      setSavingPhase(null);
    }
  }

  const writtenCount = rows.filter((r) => r.written).length;

  return (
    <Card className="p-5 sm:p-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <CalendarHeart className="h-5 w-5 shrink-0 text-royal-600" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg text-ink">Cycle training guidance</span>
          <span className="block text-sm text-muted">
            What you&apos;d tell a client training in each phase. {writtenCount} of 4 written.
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-5 space-y-4 border-t border-line pt-5">
          {rows.map((row) => (
            <div key={row.phase}>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink">{PHASE_LABEL[row.phase]}</span>
                {row.written ? (
                  <Badge tone="green">Written</Badge>
                ) : (
                  <Badge tone="neutral">Nothing yet</Badge>
                )}
                {savedPhase === row.phase && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                    Saved
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                value={row.training}
                onChange={(e) => edit(row.phase, e.target.value)}
                placeholder={`How should she train during her ${PHASE_LABEL[row.phase].toLowerCase()} phase?`}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-royal-500/10"
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" variant="secondary" onClick={() => save(row)} disabled={savingPhase === row.phase}>
                  {savingPhase === row.phase ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted">
            Clients only see the phase they&apos;re in, alongside a reminder to go by how they actually feel. Leave a
            phase empty and nothing shows for it.
          </p>
        </div>
      )}
    </Card>
  );
}
