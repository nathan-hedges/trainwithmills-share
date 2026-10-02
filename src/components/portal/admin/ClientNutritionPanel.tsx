"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Drumstick, Lightbulb, Pencil, Sparkles, Trash2, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import { complianceTone, tierInfo, type Tier } from "@/lib/nutrition/config";
import { STANDARD_INSIGHTS } from "@/lib/nutrition/insightTemplates";
import type { CoachInsights, InsightNote, NutritionProfileDTO } from "@/lib/nutrition/types";

const numField =
  "h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink focus:border-royal-400 focus:bg-white focus:outline-none";

interface Form {
  bodyWeightKg: number;
  proteinMultiplier: number;
  stepsGoal: number;
  sleepGoal: number;
  waterGoal: number;
  fiveADayGoal: number;
}

const GOALS: { key: keyof Form; label: string; step?: number; suffix?: string }[] = [
  { key: "bodyWeightKg", label: "Weight", step: 0.5, suffix: "kg" },
  { key: "proteinMultiplier", label: "Protein", step: 0.1, suffix: "g/kg" },
  { key: "stepsGoal", label: "Steps", step: 500 },
  { key: "sleepGoal", label: "Sleep", step: 0.5, suffix: "h" },
  { key: "waterGoal", label: "Water", step: 0.25, suffix: "L" },
  { key: "fiveADayGoal", label: "5-a-day", step: 1 },
];

function ComplianceRow({ label, pct, delta }: { label: string; pct: number; delta: number }) {
  const tone = complianceTone(pct);
  const deltaCls = delta > 2 ? "text-emerald-600" : delta < -2 ? "text-amber-600" : "text-muted";
  const deltaText = delta > 2 ? `+${delta}%` : delta < -2 ? `${delta}%` : "steady";
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
        <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("w-9 text-right text-xs font-medium tabular-nums", tone.text)}>{pct}%</span>
      <span className={cn("w-16 text-right text-[11px]", deltaCls)}>{deltaText}</span>
    </div>
  );
}

export function ClientNutritionPanel({ clientId }: { clientId: string }) {
  const [tier, setTier] = useState<Tier | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [ins, setIns] = useState<CoachInsights | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const loadInsights = useCallback(() => {
    fetch(`/api/clients/${clientId}/nutrition/insights`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: CoachInsights | null) => d && setIns(d))
      .catch(() => {});
  }, [clientId]);

  useEffect(() => {
    let active = true;
    fetch(`/api/clients/${clientId}/nutrition`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { tier: Tier | null; profile: NutritionProfileDTO } | null) => {
        if (!active) return;
        setLoaded(true);
        if (!d) return;
        setTier(d.tier);
        setForm({
          bodyWeightKg: d.profile.bodyWeightKg ?? 0,
          proteinMultiplier: d.profile.proteinMultiplier,
          stepsGoal: d.profile.stepsGoal,
          sleepGoal: d.profile.sleepGoal,
          waterGoal: d.profile.waterGoal,
          fiveADayGoal: d.profile.fiveADayGoal,
        });
      })
      .catch(() => {});
    loadInsights();
    return () => {
      active = false;
    };
  }, [clientId, loadInsights]);

  if (!loaded || !form) return <Card className="p-8 text-center text-muted">Loading nutrition…</Card>;

  // Tier comes from the client's plan. No plan → nothing to set up here.
  if (!tier) {
    return (
      <Card className="p-8 text-center text-muted">
        This client has no active plan. Assign one in <span className="font-medium text-ink">Manage</span>{" "}
        to set their nutrition targets.
      </Card>
    );
  }

  const proteinGoal = form.bodyWeightKg ? Math.round(form.bodyWeightKg * form.proteinMultiplier) : 0;

  function update(key: keyof Form, raw: string) {
    setSaved(false);
    setForm((f) => (f ? { ...f, [key]: Math.max(0, Number(raw) || 0) } : f));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/clients/${clientId}/nutrition/goals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        loadInsights(); // goals changed → compliance recomputes
      }
    } finally {
      setSaving(false);
    }
  }

  async function addNote(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/nutrition/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const note: InsightNote = await res.json();
        setIns((p) => (p ? { ...p, notes: [note, ...p.notes] } : p));
        setDraft("");
      }
    } finally {
      setAdding(false);
    }
  }

  async function deleteNote(id: string) {
    await fetch(`/api/clients/${clientId}/nutrition/insights/${id}`, { method: "DELETE" }).catch(() => {});
    setIns((p) => (p ? { ...p, notes: p.notes.filter((n) => n.id !== id) } : p));
  }

  async function saveEdit(id: string) {
    const text = editText.trim();
    if (!text) return;
    const res = await fetch(`/api/clients/${clientId}/nutrition/insights/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      setIns((p) => (p ? { ...p, notes: p.notes.map((n) => (n.id === id ? { ...n, text } : n)) } : p));
      setEditId(null);
    }
  }

  const isPerformance = tier === "performance";
  const usedTexts = new Set(ins?.notes.map((n) => n.text) ?? []);
  // Data-driven suggestions from their logs; fall back to standard tips when there's little data.
  const dataSuggestions = (ins?.analytics.suggestions ?? []).filter((s) => !usedTexts.has(s));
  const fallbackTips = STANDARD_INSIGHTS.filter((s) => !usedTexts.has(s));
  const addPool = dataSuggestions.length > 0 ? dataSuggestions : fallbackTips;
  const fromData = dataSuggestions.length > 0;

  return (
    <div className="space-y-6">
      {/* Targets */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-royal-50 text-royal-600">
            <Drumstick className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-lg">Nutrition targets</h3>
            <p className="text-xs text-muted">Set this client&apos;s goals.</p>
          </div>
        </div>

        {/* Access level is read-only -it comes from their plan. */}
        <div className="mt-5 flex flex-col gap-1 rounded-xl border border-line bg-paper p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <span className="font-medium text-ink">Full nutrition access</span>
            <span className="text-muted"> · {tierInfo(tier).habitControlLabel.toLowerCase()}</span>
          </div>
          <span className="text-xs text-muted">From their plan · change in Manage</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GOALS.map((g) => (
            <label key={g.key} className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              <span className="leading-tight">
                {g.label}
                {g.suffix ? <span className="font-normal text-muted/60"> ({g.suffix})</span> : null}
              </span>
              <input
                type="number"
                min={0}
                step={g.step ?? 1}
                value={form[g.key] || ""}
                onChange={(e) => update(g.key, e.target.value)}
                className={numField}
              />
            </label>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <p className="text-sm text-muted">
            Protein goal:{" "}
            <span className="font-semibold text-ink">{proteinGoal ? `${proteinGoal}g/day` : " -"}</span>
          </p>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                <Check className="h-4 w-4" /> Saved
              </span>
            )}
            <Button onClick={save} size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save targets"}
            </Button>
          </div>
        </div>
      </Card>

      {/* This week's compliance */}
      {ins && (
        <Card className="p-5 sm:p-6">
          <h3 className="flex items-center gap-2 font-display text-lg">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            This week
          </h3>
          <p className="text-xs text-muted">
            Logged {ins.analytics.daysLogged}/7 days · goal completion vs last week.
          </p>
          <div className="mt-4 space-y-2.5">
            <ComplianceRow label="Protein" pct={ins.analytics.protein.pct} delta={ins.analytics.protein.deltaVsLastWeek} />
            <ComplianceRow label="Steps" pct={ins.analytics.steps.pct} delta={ins.analytics.steps.deltaVsLastWeek} />
            <ComplianceRow label="Sleep" pct={ins.analytics.sleep.pct} delta={ins.analytics.sleep.deltaVsLastWeek} />
            <ComplianceRow label="Water" pct={ins.analytics.water.pct} delta={ins.analytics.water.deltaVsLastWeek} />
            <ComplianceRow label="5-a-day" pct={ins.analytics.fiveADay.pct} delta={ins.analytics.fiveADay.deltaVsLastWeek} />
          </div>
        </Card>
      )}

      {/* Insights -Performance tier only (that's the tier that sees them) */}
      {isPerformance && (
        <Card className="p-5 sm:p-6">
          <h3 className="flex items-center gap-2 font-display text-lg">
            <Sparkles className="h-5 w-5 text-gold-500" />
            Insights
          </h3>
          <p className="text-xs text-muted">
            Standard tips and data-driven insights show on the client&apos;s page automatically. Add your own
            personalised notes below -they appear to her as <span className="font-medium text-gold-600">From me</span>.
          </p>

          {/* Your added notes -visually distinct so they stand out from suggestions */}
          <div className="mt-4 space-y-2">
            {(ins?.notes.length ?? 0) > 0 && (
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gold-600">
                <Sparkles className="h-3.5 w-3.5" /> Your notes
              </p>
            )}
            {ins?.notes.map((n) =>
              editId === n.id ? (
                <div key={n.id} className="flex items-start gap-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-royal-400 focus:bg-white focus:outline-none"
                  />
                  <Button size="sm" onClick={() => saveEdit(n.id)} disabled={!editText.trim()}>Save</Button>
                  <button type="button" onClick={() => setEditId(null)} aria-label="Cancel" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:text-ink">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div key={n.id} className="flex items-start gap-2 rounded-xl border border-gold-300 bg-gold-100/50 p-3 text-sm text-royal-950">
                  <span className="flex-1">{n.text}</span>
                  <button
                    type="button"
                    onClick={() => { setEditId(n.id); setEditText(n.text); }}
                    aria-label="Edit insight"
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-white hover:text-ink"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteNote(n.id)}
                    aria-label="Delete insight"
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            )}
          </div>

          {/* Suggestions to add -data-driven from their logs, else standard tips */}
          {addPool.length > 0 && (
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <Lightbulb className="h-3.5 w-3.5 text-gold-500" />
                {fromData ? "Suggested from their logs - click to add:" : "Coaching tips you can add - click to use:"}
              </p>
              <div className="mt-2 space-y-1.5">
                {addPool.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft(s)}
                    className="w-full rounded-lg border border-dashed border-line bg-paper p-2.5 text-left text-sm text-ink transition-colors hover:border-royal-300 hover:bg-royal-50/50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 flex items-start gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add an insight or note for this client…"
              rows={2}
              className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-royal-400 focus:bg-white focus:outline-none"
            />
            <Button size="sm" onClick={() => addNote(draft)} disabled={!draft.trim() || adding}>
              {adding ? "Adding…" : "Add"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
