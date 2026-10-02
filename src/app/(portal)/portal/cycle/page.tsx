"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarHeart,
  Check,
  Droplet,
  HeartPulse,
  Lock,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Card, PageHeading } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/portal/ConfirmDialog";
import { CycleCalendar, type CalendarDay } from "@/components/portal/cycle/CycleCalendar";
import { DayLogSheet, type DayPayload } from "@/components/portal/cycle/DayLogSheet";
import { cn } from "@/lib/utils";
import { PHASE_LABEL, SHARE_LEVELS, type Phase, type ShareLevel } from "@/lib/cycle";

interface Prediction {
  predicts: boolean;
  cycleDay: number | null;
  phase: Phase | null;
  cycleLength: number;
  fromHerData: boolean;
  lastPeriodStart: string | null;
  nextPeriodStart: string | null;
  daysUntilNextPeriod: number | null;
  concern: "none" | "no-period-90" | "long-bleed";
}
interface CycleData {
  status: "not-set-up" | "needs-consent" | "active";
  profile?: {
    contraception: string;
    contraceptionLabel: string;
    avgCycleLength: number;
    avgPeriodLength: number;
    shareLevel: ShareLevel;
    predicts: boolean;
    predictionNote: string | null;
  };
  prediction?: Prediction;
  todayLog?: CalendarDay | null;
  logs?: CalendarDay[];
  guidance?: { phase: Phase; training: string }[];
  energyByPhase?: { phase: Phase; average: number; sessions: number }[];
  symptomPatterns?: { symptom: string; pct: number; days: number; phase: Phase }[];
  cycleLengths?: { start: string; length: number }[];
  predictedPeriod?: string[];
  predictedOvulation?: string[];
}

const phaseTone: Record<Phase, string> = {
  menstrual: "bg-red-50 text-red-700 border-red-200",
  follicular: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ovulation: "bg-gold-100 text-gold-600 border-gold-500/40",
  luteal: "bg-royal-50 text-royal-700 border-royal-200",
};

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const todayKey = () => new Date().toISOString().split("T")[0];

export default function CyclePage() {
  const [data, setData] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sheet, setSheet] = useState<{ date: string; existing: CalendarDay | null } | null>(null);
  const [lastPeriod, setLastPeriod] = useState("");
  // No default: she has to choose what Millie sees before tracking starts.
  const [consentShare, setConsentShare] = useState<ShareLevel | "">("");

  const load = useCallback(async () => {
    const res = await fetch("/api/me/cycle");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function consent() {
    setSaving(true);
    try {
      const res = await fetch("/api/me/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastPeriodStart: lastPeriod || null }),
      });
      if (!res.ok) return;
      // Store her sharing choice straight after consenting.
      if (consentShare) {
        await fetch("/api/me/cycle/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shareLevel: consentShare }),
        }).catch(() => {});
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function saveDay(payload: DayPayload) {
    setSaving(true);
    try {
      const res = await fetch("/api/me/cycle/log", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSheet(null);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  /** One tap: today becomes a medium-flow day. How most people actually log. */
  async function periodStartedToday() {
    await saveDay({
      date: todayKey(),
      flow: "medium",
      symptoms: data?.todayLog?.symptoms ?? [],
      mood: data?.todayLog?.mood ?? null,
      sleepQuality: data?.todayLog?.sleepQuality ?? null,
      note: data?.todayLog?.note ?? null,
    });
  }

  async function setShareLevel(level: ShareLevel) {
    await fetch("/api/me/cycle/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareLevel: level }),
    });
    await load();
  }

  async function deleteEverything() {
    setConfirmDelete(false);
    setSaving(true);
    try {
      await fetch("/api/me/cycle/settings", { method: "DELETE" });
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Card className="p-10 text-center text-muted">Loading…</Card>;

  // ── Millie hasn't set this up yet ────────────────────────────────
  if (!data || data.status === "not-set-up") {
    return (
      <div className="space-y-6">
        <PageHeading title="My Cycle" />
        <Card className="mx-auto max-w-lg p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-royal-50 text-royal-600">
            <CalendarHeart className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-2xl">Not set up yet</h2>
          <p className="mt-2 text-muted">
            Cycle tracking is something I set up with you, so the guidance actually fits your situation. Have a word
            with me and I&apos;ll switch it on.
          </p>
        </Card>
      </div>
    );
  }

  // ── Configured, but she hasn't opted in ──────────────────────────
  if (data.status === "needs-consent") {
    return (
      <div className="space-y-6">
        <PageHeading title="My Cycle" />
        <Card className="mx-auto max-w-lg p-8">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-royal-50 text-royal-600">
            <Shield className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-2xl">Your cycle, your call</h2>
          <p className="mt-3 text-muted">
            Tracking your cycle can help you understand why some sessions feel harder than others - and lets me
            programme around you rather than in spite of you.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ink/80">
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-royal-600" />
              This is health information, so nothing is stored until you say yes.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-royal-600" />
              You can delete everything, permanently, in one tap - any time.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-royal-600" />
              It&apos;s guidance for training, not medical advice or contraception.
            </li>
          </ul>

          <div className="mt-5">
            <span className="block text-sm font-medium text-ink">What would you like me to see?</span>
            <div className="mt-2 space-y-2">
              {SHARE_LEVELS.map((opt) => {
                const active = consentShare === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setConsentShare(opt.value)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
                      active ? "border-royal-400 bg-royal-50/60" : "border-line hover:bg-paper",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                        active ? "border-royal-600 bg-royal-600 text-white" : "border-line",
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-ink">{opt.title}</span>
                      <span className="block text-xs text-muted">{opt.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">You can change this whenever you like.</p>
          </div>

          <label className="mt-5 block text-sm font-medium text-ink">
            When did your last period start? <span className="font-normal text-muted">(optional)</span>
            <input
              type="date"
              max={todayKey()}
              value={lastPeriod}
              onChange={(e) => setLastPeriod(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15"
            />
            <span className="mt-1 block text-xs text-muted">
              Tell us and your calendar works from today. Skip it and it&apos;ll build up as you log.
            </span>
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={consent} disabled={saving || !consentShare}>
              {saving ? "Just a sec…" : "Yes, start tracking"}
            </Button>
            <Button href="/portal" variant="secondary">
              Not for me
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Active ───────────────────────────────────────────────────────
  const p = data.prediction!;
  const profile = data.profile!;
  const guidance = data.guidance?.find((g) => g.phase === p.phase) ?? null;
  const bleedingToday = Boolean(data.todayLog?.flow);
  const maxLength = Math.max(...(data.cycleLengths ?? []).map((c) => c.length), profile.avgCycleLength);

  return (
    <div className="space-y-6">
      <PageHeading
        title="My Cycle"
        subtitle={
          p.predicts
            ? "Where you are, how you tend to feel, and what I suggest."
            : "Your bleeds and symptoms, tracked - so you and I can spot your patterns."
        }
      />

      {p.concern !== "none" && (
        <Card className="border-amber-200 bg-amber-50/70 p-5">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">Worth a mention</p>
              <p className="mt-1">
                {p.concern === "no-period-90"
                  ? "You haven't logged a period in over 90 days. That can happen for lots of reasons, plenty of them harmless - but it's worth speaking to your GP, and letting me know so I can support your training around it."
                  : "You've logged over a week of bleeding in a row. It's worth mentioning to your GP, and telling me so I can adjust your training if you're feeling drained."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Status + quick log */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          {p.predicts ? (
            p.cycleDay ? (
              <>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-display text-5xl tracking-tight text-ink">Day {p.cycleDay}</span>
                  {p.phase && (
                    <span className={cn("rounded-full border px-3 py-1 text-sm font-medium", phaseTone[p.phase])}>
                      {PHASE_LABEL[p.phase]}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-muted">
                  {p.daysUntilNextPeriod != null && p.daysUntilNextPeriod >= 0
                    ? `Next period expected in ${p.daysUntilNextPeriod} ${p.daysUntilNextPeriod === 1 ? "day" : "days"} (around ${fmtDay(p.nextPeriodStart!)}).`
                    : "Your next period is due - log it when it starts."}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {p.fromHerData
                    ? `Based on your last few cycles (about ${p.cycleLength} days). An estimate, not a guarantee.`
                    : `Using ${p.cycleLength} days until you've logged a couple of cycles. It'll get more accurate.`}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl">Let&apos;s get started</h2>
                <p className="mt-2 text-sm text-muted">
                  Log your period below - or tap any day on the calendar - and your cycle day, phase and predictions
                  will appear here.
                </p>
              </>
            )
          ) : (
            <>
              <h2 className="font-display text-2xl">Tracking your bleeds &amp; symptoms</h2>
              <p className="mt-2 text-sm text-muted">{profile.predictionNote}</p>
              {p.lastPeriodStart && (
                <p className="mt-2 text-xs text-muted">Last logged bleed started {fmtDay(p.lastPeriodStart)}.</p>
              )}
            </>
          )}

          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <Button size="sm" onClick={periodStartedToday} disabled={saving || bleedingToday}>
              <Droplet className="h-4 w-4" />
              {bleedingToday ? "Logged for today" : "My period started"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSheet({ date: todayKey(), existing: data.todayLog ?? null })}
            >
              Log today in detail
            </Button>
          </div>
        </Card>

        {/* My guidance for this phase */}
        {p.predicts && p.phase && guidance ? (
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-lg">
              <Sparkles className="h-5 w-5 text-gold-500" />
              Training in your {PHASE_LABEL[p.phase].toLowerCase()} phase
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm text-ink/80">{guidance.training}</p>
            <p className="mt-3 text-xs text-muted">
              General guidance to train alongside your cycle - always go by how you actually feel on the day.
            </p>
          </Card>
        ) : (
          <Card className="p-6">
            <h2 className="font-display text-lg">Your calendar</h2>
            <p className="mt-2 text-sm text-muted">
              Tap any day to record bleeding, symptoms, mood and sleep. The more you log, the more your own patterns
              show up below.
            </p>
          </Card>
        )}
      </div>

      {/* Calendar - replaces the old flat list */}
      <Card className="p-5 sm:p-6">
        <CycleCalendar
          logs={data.logs ?? []}
          profile={{
            contraception: profile.contraception,
            avgCycleLength: profile.avgCycleLength,
            avgPeriodLength: profile.avgPeriodLength,
          }}
          predictedPeriod={data.predictedPeriod ?? []}
          predictedOvulation={data.predictedOvulation ?? []}
          showPhases={p.predicts}
          onPickDay={(date, existing) => setSheet({ date, existing })}
        />
      </Card>

      {/* Patterns */}
      {((data.energyByPhase?.length ?? 0) > 0 || (data.symptomPatterns?.length ?? 0) > 0) && (
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <HeartPulse className="h-5 w-5 text-royal-600" />
            Your own patterns
          </h2>
          <p className="mt-1 text-sm text-muted">This is you, not a textbook.</p>

          {(data.energyByPhase?.length ?? 0) > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Energy after training, by phase
              </h3>
              <ul className="mt-2 space-y-2.5">
                {data.energyByPhase!.map((e) => (
                  <li key={e.phase} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm text-ink">{PHASE_LABEL[e.phase]}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-royal-500 transition-all duration-500"
                        style={{ width: `${(e.average / 5) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-sm tabular-nums text-muted">
                      {e.average}/5 · {e.sessions}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data.symptomPatterns?.length ?? 0) > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">What you tend to feel, when</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-ink/80">
                {data.symptomPatterns!.map((s) => (
                  <li key={`${s.phase}-${s.symptom}`}>
                    <span className="font-medium text-ink">{s.symptom}</span> on {s.pct}% of your{" "}
                    {PHASE_LABEL[s.phase].toLowerCase()} days
                    <span className="text-muted"> ({s.days} logged)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data.cycleLengths?.length ?? 0) > 1 && (
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Your recent cycle lengths</h3>
              <div className="mt-3 flex items-end gap-2">
                {data.cycleLengths!.map((c) => (
                  <div key={c.start} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs tabular-nums text-muted">{c.length}</span>
                    <div
                      className="w-full rounded-t-lg bg-royal-400"
                      style={{ height: `${Math.max(12, (c.length / maxLength) * 80)}px` }}
                    />
                    <span className="text-[10px] text-muted">{fmtDay(c.start)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">Days from one period starting to the next.</p>
            </div>
          )}
        </Card>
      )}

      {/* Privacy controls */}
      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <Lock className="h-5 w-5 text-royal-600" />
          What you share with me
        </h2>
        <div className="mt-3 space-y-2">
          {SHARE_LEVELS.map((opt) => {
            const active = profile.shareLevel === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setShareLevel(opt.value)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
                  active ? "border-royal-400 bg-royal-50/60" : "border-line hover:bg-paper",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                    active ? "border-royal-600 bg-royal-600 text-white" : "border-line",
                  )}
                >
                  {active && <Check className="h-3 w-3" />}
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink">{opt.title}</span>
                  <span className="block text-xs text-muted">{opt.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        {profile.shareLevel === "private" && (
          <p className="mt-3 rounded-xl border border-royal-200 bg-royal-50/60 p-3 text-xs text-royal-900">
            I can&apos;t see any of this - not your phase, symptoms or notes. Your training plan won&apos;t be
            adjusted around your cycle while it&apos;s private, and if anything looks worth checking you&apos;ll see
            it here rather than me.
          </p>
        )}

        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete all my cycle data
        </button>
      </Card>

      {sheet && (
        <DayLogSheet
          date={sheet.date}
          existing={sheet.existing}
          saving={saving}
          onSave={saveDay}
          onClose={() => setSheet(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete all your cycle data?"
          message="Every day you've logged will be permanently erased and tracking will switch off. This can't be undone - though you can always opt back in later."
          confirmLabel="Delete everything"
          onConfirm={deleteEverything}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
