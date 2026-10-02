"use client";

import { useEffect, useState } from "react";
import { CalendarHeart } from "lucide-react";
import { CONTRACEPTION, contraceptionInfo } from "@/lib/cycle";

const field =
  "h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink transition-colors focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15";

interface Snapshot {
  status: "not-set-up" | "awaiting-consent" | "active";
  setup?: {
    contraception: string;
    avgCycleLength: number;
    avgPeriodLength: number;
    predicts: boolean;
    shareLevel: string;
  };
}

/**
 * Cycle setup inside the Manage modal. Millie configures it (usually on a call);
 * the client still has to opt in before anything is stored, which is what the
 * status line explains.
 */
export function CycleSetup({ clientId }: { clientId: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [contraception, setContraception] = useState("none");
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/cycle`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Snapshot | null) => {
        if (!d) return;
        setSnap(d);
        if (d.setup) {
          setContraception(d.setup.contraception);
          setCycleLength(d.setup.avgCycleLength);
          setPeriodLength(d.setup.avgPeriodLength);
        }
      })
      .catch(() => {});
  }, [clientId]);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/clients/${clientId}/cycle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contraception,
          avgCycleLength: Number(cycleLength),
          avgPeriodLength: Number(periodLength),
        }),
      });
      if (res.ok) {
        setSaved(true);
        const fresh = await fetch(`/api/clients/${clientId}/cycle`).then((r) => (r.ok ? r.json() : null));
        if (fresh) setSnap(fresh);
      }
    } finally {
      setSaving(false);
    }
  }

  const info = contraceptionInfo(contraception);
  const status =
    snap?.status === "active"
      ? "Tracking - she's opted in."
      : snap?.status === "awaiting-consent"
        ? "Set up - waiting for her to opt in on her cycle page."
        : "Not set up yet.";

  return (
    <div className="rounded-xl border border-line bg-paper p-3.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-sm font-medium text-ink"
      >
        <CalendarHeart className="h-4 w-4 text-royal-600" />
        Cycle tracking
        <span className="ml-auto text-xs font-normal text-muted">{open ? "Hide" : "Set up"}</span>
      </button>
      <p className="mt-1 text-xs text-muted">{status}</p>

      {open && (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          <label className="block text-xs font-medium text-ink">
            Contraception
            <select
              value={contraception}
              onChange={(e) => setContraception(e.target.value)}
              className={`mt-1 ${field}`}
            >
              {CONTRACEPTION.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <p className="text-xs text-muted">
            {info.blocksPrediction
              ? "No phase predictions for this one - she'll get bleed and symptom tracking, which is the honest thing to show."
              : "Phase predictions will run from her logged periods."}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-ink">
              Usual cycle (days)
              <input
                type="number"
                min={15}
                max={60}
                value={cycleLength}
                onChange={(e) => setCycleLength(Number(e.target.value))}
                className={`mt-1 ${field}`}
              />
            </label>
            <label className="block text-xs font-medium text-ink">
              Usual period (days)
              <input
                type="number"
                min={1}
                max={14}
                value={periodLength}
                onChange={(e) => setPeriodLength(Number(e.target.value))}
                className={`mt-1 ${field}`}
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-royal-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-royal-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : snap?.status === "not-set-up" ? "Set up tracking" : "Save changes"}
            </button>
            {saved && <span className="text-xs font-medium text-emerald-600">Saved</span>}
          </div>

          <p className="text-[11px] text-muted">
            She decides what you can see (phase and energy only, or symptoms too) and can erase it all at any time.
          </p>
        </div>
      )}
    </div>
  );
}
