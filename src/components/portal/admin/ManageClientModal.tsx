"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Ban, CreditCard, RotateCcw, X } from "lucide-react";
import { tiers } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { CycleSetup } from "./CycleSetup";

/** The subset of a client this modal reads + writes. Matches the /api/clients shape. */
export interface ManagedClient {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  goal?: string | null;
  program?: string | null;
  plan?: string | null;
  status?: string | null;
  billingExempt?: boolean;
  subscriptionStatus?: string | null;
  dateOfBirth?: string | null;
  lifestyle?: string | null;
  injuries?: string | null;
}

interface BillingSnapshot {
  exempt: boolean;
  hasSubscription: boolean;
  status: string | null;
  amount: number | null; // pence
  nextBillingDate: string | null;
  endsOn: string | null;
  /** One-off Strong Girl Project state (null when not on that plan). */
  programme: null | {
    paid: boolean;
    paidOn: string | null;
    groupName: string | null;
    startsOn: string | null;
    lastDay: string | null;
    ended: boolean;
  };
}

const field =
  "h-11 w-full rounded-xl border border-line bg-paper px-3.5 text-sm text-ink transition-colors focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-royal-500/10";
const labelCls = "mb-1.5 block text-sm font-medium text-ink";

function billingLine(b: BillingSnapshot): string {
  if (b.exempt) return "Not billed - this client isn't paying for their plan.";
  if (b.programme) {
    const p = b.programme;
    if (!p.paid) return "One-off programme - not paid yet; they'll be asked to pay when they next sign in.";
    if (!p.groupName) return `Paid ${p.paidOn} - waiting for a group, so their 6 weeks haven't started.`;
    if (p.ended) return `${p.groupName} finished on ${p.lastDay} - their programme has ended.`;
    return `Paid ${p.paidOn} · ${p.groupName} · runs ${p.startsOn} - ${p.lastDay}.`;
  }
  if (!b.hasSubscription) return "No subscription yet - they'll be asked to pay when they next sign in.";
  const price = b.amount != null ? `£${(b.amount / 100).toFixed(2)}/month` : "Subscribed";
  if (b.endsOn) return `${price} · cancellation scheduled - access ends ${b.endsOn}.`;
  if (b.status === "past_due" || b.status === "unpaid") return `${price} · last payment FAILED - portal is paused.`;
  return `${price} · next payment ${b.nextBillingDate ?? "-"}.`;
}

export function ManageClientModal({
  client,
  onClose,
  onSaved,
}: {
  client: ManagedClient;
  onClose: () => void;
  /** Called with the updated client so the detail page can refresh. */
  onSaved?: (updated: ManagedClient) => void;
}) {
  const [program, setProgram] = useState(client.program ?? "");
  const [goal, setGoal] = useState(client.goal ?? "");
  const [plan, setPlan] = useState(client.plan ?? "");
  const [exempt, setExempt] = useState(client.billingExempt ?? false);
  const [dateOfBirth, setDateOfBirth] = useState(client.dateOfBirth?.slice(0, 10) ?? "");
  const [lifestyle, setLifestyle] = useState(client.lifestyle ?? "");
  const [injuries, setInjuries] = useState(client.injuries ?? "");
  const [billing, setBilling] = useState<BillingSnapshot | null>(null);
  const [confirmShutdown, setConfirmShutdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paused = client.status === "paused";

  useEffect(() => {
    fetch(`/api/clients/${client.id}/billing`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b: BillingSnapshot | null) => b && setBilling(b))
      .catch(() => {});
  }, [client.id]);

  /** PATCH the client's editable fields, then notify the parent and close. */
  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program: program.trim() || null,
          goal: goal.trim() || null,
          billingExempt: exempt,
          dateOfBirth,
          lifestyle,
          injuries,
          // Plans can only be changed to a real tier (cancelling is its own action).
          ...(plan ? { plan, status: "active" } : {}),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved?.((await res.json()) as ManagedClient);
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not save. Please try again.");
      setSaving(false);
    }
  }

  /** Cancel / reactivate / shutdown via the billing endpoint (syncs Stripe + emails the client). */
  async function billingAction(action: "cancel" | "reactivate" | "shutdown") {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${client.id}/billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved?.((await res.json()) as ManagedClient);
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not update billing. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-white shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-display text-lg">Manage client</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="mc-program" className={labelCls}>
              Program name
            </label>
            <input
              id="mc-program"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="e.g. Strength - Phase 2"
              className={field}
            />
          </div>

          <div>
            <label htmlFor="mc-goal" className={labelCls}>
              Goal
            </label>
            <input
              id="mc-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Build strength & confidence"
              className={field}
            />
          </div>

          <div>
            <label htmlFor="mc-dob" className={labelCls}>
              Date of birth
            </label>
            <input
              id="mc-dob"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="mc-lifestyle" className={labelCls}>
              Current lifestyle
            </label>
            <textarea
              id="mc-lifestyle"
              rows={3}
              value={lifestyle}
              onChange={(e) => setLifestyle(e.target.value)}
              placeholder="Work, family, sleep, training history…"
              className={`${field} h-auto resize-none py-2.5`}
            />
          </div>

          <div>
            <label htmlFor="mc-injuries" className={labelCls}>
              Injuries / limitations
            </label>
            <textarea
              id="mc-injuries"
              rows={2}
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="e.g. Dodgy left knee - no deep lunges"
              className={`${field} h-auto resize-none py-2.5`}
            />
            <p className="mt-1.5 text-xs text-muted">
              Shows while you&apos;re programming her sessions. Empty this box to clear it.
            </p>
          </div>

          <div>
            <label htmlFor="mc-plan" className={labelCls}>
              Plan
            </label>
            <select id="mc-plan" value={plan} onChange={(e) => setPlan(e.target.value)} className={field}>
              {!client.plan && (
                <option value="" disabled>
                  No plan - pick one to assign
                </option>
              )}
              {tiers.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} -{" "}
                  {t.billing === "one-off" ? `${t.price} · ${t.cadence}` : `${t.price}/${t.cadence.replace("per ", "")}`}
                </option>
              ))}
            </select>
            {plan && client.plan && plan !== client.plan && (
              <p className="mt-1.5 text-xs text-muted">
                {tiers.find((t) => t.name === plan)?.billing === "one-off"
                  ? "On save: features change immediately. It's a one-off payment - they'll be asked to secure their place when they next sign in. Any existing subscription is NOT cancelled automatically."
                  : "On save: features change immediately; their payment changes from the next billing date. They'll get an email explaining this."}
              </p>
            )}
          </div>

          {/* Billing */}
          <div className="rounded-xl border border-line bg-paper p-3.5">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <CreditCard className="h-4 w-4 text-royal-600" />
              Billing
            </div>
            <p className="mt-1 text-xs text-muted">{billing ? billingLine(billing) : "Checking Stripe…"}</p>
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 border-t border-line pt-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={exempt}
                onChange={(e) => setExempt(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-royal-600"
              />
              <span>
                Exempt from payment
                <span className="block text-xs font-normal text-muted">
                  They get portal access without a subscription (comped / grandfathered).
                </span>
              </span>
            </label>
          </div>

          <CycleSetup clientId={client.id} />

          {/* Plan actions */}
          <div className="rounded-xl border border-line bg-paper p-3.5">
            <div className="text-sm font-medium text-ink">Status: {paused ? "Paused" : "Active"}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {paused || billing?.endsOn ? (
                <button
                  type="button"
                  onClick={() => billingAction("reactivate")}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reactivate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => billingAction("cancel")}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancel plan
                </button>
              )}
              {confirmShutdown ? (
                <span className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => billingAction("shutdown")}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Yes, shut down now
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmShutdown(false)}
                    className="text-xs font-medium text-muted hover:text-ink"
                  >
                    Keep access
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmShutdown(true)}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Shut down access
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">
              {billing?.programme ? (
                <>
                  <span className="font-medium text-ink">Cancel plan</span> ends their programme access straight away
                  (one-off payments have no billing period).{" "}
                </>
              ) : (
                <>
                  <span className="font-medium text-ink">Cancel plan</span> keeps their access until the paid period
                  ends.{" "}
                </>
              )}
              <span className="font-medium text-ink">Shut down</span> cuts everything off immediately (policy breaches).
              Both email the client.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-4">
          {error && <span className="mr-auto text-sm text-red-600">{error}</span>}
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-11 items-center rounded-full px-4 text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
