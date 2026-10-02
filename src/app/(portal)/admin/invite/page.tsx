"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, ChevronDown, Copy, Link2, Mail, Send, Undo2 } from "lucide-react";
import { tiers } from "@/lib/content";
import { Badge, Card, PageHeading } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import { CONTRACEPTION, contraceptionInfo } from "@/lib/cycle";

type ApiInvite = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  plan: string;
  token: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  createdAt: string;
};

const field =
  "h-11 w-full rounded-xl border border-line bg-paper px-3.5 text-sm text-ink placeholder:text-muted/60 transition-all focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-royal-500/10";

const statusTone: Record<ApiInvite["status"], "amber" | "green" | "neutral"> = {
  PENDING: "amber",
  ACCEPTED: "green",
  REVOKED: "neutral",
};

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function InviteClientsPage() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [plan, setPlan] = useState(tiers.find((t) => t.featured)?.name ?? tiers[0].name);
  const [created, setCreated] = useState<{ email: string; token: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [invites, setInvites] = useState<ApiInvite[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // What the onboarding call turns up. All optional.
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [lifestyle, setLifestyle] = useState("");
  const [injuries, setInjuries] = useState("");
  const [goal, setGoal] = useState("");
  const [cycleTracking, setCycleTracking] = useState(false);
  const [contraception, setContraception] = useState("none");
  const [avgCycleLength, setAvgCycleLength] = useState(28);
  const [avgPeriodLength, setAvgPeriodLength] = useState(5);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkFor = (token: string) => `${origin}/welcome?token=${token}`;

  const loadInvites = useCallback(async () => {
    try {
      const res = await fetch("/api/invites");
      if (res.ok) setInvites(await res.json());
    } catch {
      /* ignore - the list just stays as-is */
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(linkFor(token));
      setCopiedToken(token);
      window.setTimeout(() => setCopiedToken((t) => (t === token ? null : t)), 1800);
    } catch {
      /* clipboard unavailable - ignore */
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          plan,
          dateOfBirth: dateOfBirth || undefined,
          lifestyle: lifestyle.trim() || undefined,
          injuries: injuries.trim() || undefined,
          goal: goal.trim() || undefined,
          cycleTracking,
          ...(cycleTracking
            ? {
                contraception,
                avgCycleLength: Number(avgCycleLength),
                avgPeriodLength: Number(avgPeriodLength),
              }
            : {}),
        }),
      });
      if (!res.ok) {
        setError(
          res.status === 403
            ? "Only a signed-in coach can send invites."
            : "Couldn't create the invite. Please try again.",
        );
        return;
      }
      const data = (await res.json()) as { token: string };
      setCreated({ email: email.trim(), token: data.token });
      setDateOfBirth("");
      setLifestyle("");
      setInjuries("");
      setGoal("");
      setCycleTracking(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      loadInvites();
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function revoke(token: string) {
    await fetch(`/api/invites/${token}`, { method: "DELETE" });
    loadInvites();
  }

  const pendingCount = invites.filter((i) => i.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Invite a client"
        subtitle="Send a secure sign-up link - they pay for their plan when they create their account."
      />

      <div className="max-w-2xl">
        {/* Form */}
        <Card className="p-6 sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="inv-email" className="mb-1.5 block text-sm font-medium text-ink">
                Client email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="inv-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@email.com"
                  className={`${field} pl-10`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="inv-first" className="mb-1.5 block text-sm font-medium text-ink">
                  First name <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="inv-first"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First"
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="inv-last" className="mb-1.5 block text-sm font-medium text-ink">
                  Last name <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="inv-last"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last"
                  className={field}
                />
              </div>
            </div>

            <div>
              <label htmlFor="inv-plan" className="mb-1.5 block text-sm font-medium text-ink">
                Their plan
              </label>
              <div className="relative">
                <select
                  id="inv-plan"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className={`${field} appearance-none pr-10`}
                >
                  {tiers.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} -{" "}
                      {t.billing === "one-off"
                        ? `${t.price} · ${t.cadence}`
                        : `${t.price}/${t.cadence.replace("per ", "")}`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </div>
            </div>

            {/* ── From the onboarding call ───────────────────────── */}
            <div className="space-y-4 rounded-2xl border border-line bg-paper p-4">
              <div>
                <h3 className="text-sm font-semibold text-ink">From your call</h3>
                <p className="text-xs text-muted">
                  All optional - fill in what you have, the rest can be added later in Manage.
                </p>
              </div>

              <div>
                <label htmlFor="inv-dob" className="mb-1.5 block text-sm font-medium text-ink">
                  Date of birth
                </label>
                <input
                  id="inv-dob"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className={field}
                />
              </div>

              <div>
                <label htmlFor="inv-goal" className="mb-1.5 block text-sm font-medium text-ink">
                  Goal <span className="font-normal text-muted">(be specific)</span>
                </label>
                <input
                  id="inv-goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. First unassisted pull-up by Christmas"
                  className={field}
                />
              </div>

              <div>
                <label htmlFor="inv-lifestyle" className="mb-1.5 block text-sm font-medium text-ink">
                  Current lifestyle
                </label>
                <textarea
                  id="inv-lifestyle"
                  rows={3}
                  value={lifestyle}
                  onChange={(e) => setLifestyle(e.target.value)}
                  placeholder="Work, family, sleep, how active she is day to day, training history…"
                  className={`${field} h-auto resize-none py-2.5`}
                />
              </div>

              <div>
                <label htmlFor="inv-injuries" className="mb-1.5 block text-sm font-medium text-ink">
                  Injuries / limitations
                </label>
                <textarea
                  id="inv-injuries"
                  rows={2}
                  value={injuries}
                  onChange={(e) => setInjuries(e.target.value)}
                  placeholder="e.g. Dodgy left knee - no deep lunges"
                  className={`${field} h-auto resize-none py-2.5`}
                />
                <p className="mt-1 text-xs text-muted">
                  This shows while you&apos;re programming her sessions. Clear it in Manage when it no longer applies.
                </p>
              </div>

              {/* Cycle tracking, arranged on the call */}
              <div className="border-t border-line pt-4">
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={cycleTracking}
                    onChange={(e) => setCycleTracking(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-royal-600"
                  />
                  <span>
                    She wants to track her menstrual cycle
                    <span className="block text-xs font-normal text-muted">
                      Sets it up now - she just confirms and chooses what you can see when she signs in.
                    </span>
                  </span>
                </label>

                {cycleTracking && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label htmlFor="inv-contra" className="mb-1.5 block text-sm font-medium text-ink">
                        Contraception
                      </label>
                      <select
                        id="inv-contra"
                        value={contraception}
                        onChange={(e) => setContraception(e.target.value)}
                        className={field}
                      >
                        {CONTRACEPTION.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-muted">
                        {contraceptionInfo(contraception).blocksPrediction
                          ? "No phase predictions for this one - she'll get bleed and symptom tracking instead."
                          : "Phase predictions will run from the periods she logs."}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="inv-cyclelen" className="mb-1.5 block text-sm font-medium text-ink">
                          Usual cycle (days)
                        </label>
                        <input
                          id="inv-cyclelen"
                          type="number"
                          min={15}
                          max={60}
                          value={avgCycleLength}
                          onChange={(e) => setAvgCycleLength(Number(e.target.value))}
                          className={field}
                        />
                      </div>
                      <div>
                        <label htmlFor="inv-periodlen" className="mb-1.5 block text-sm font-medium text-ink">
                          Usual period (days)
                        </label>
                        <input
                          id="inv-periodlen"
                          type="number"
                          min={1}
                          max={14}
                          value={avgPeriodLength}
                          onChange={(e) => setAvgPeriodLength(Number(e.target.value))}
                          className={field}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={sending}>
              <Send className="h-4 w-4" />
              {sending ? "Sending…" : "Send invite"}
            </Button>
            {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}
            <p className="text-center text-xs text-muted">
              Take payment your own way first, then send the link.
            </p>
          </form>

          {created && (
            <div className="mt-6 rounded-2xl border border-royal-100 bg-royal-50/60 p-5">
              <div className="flex items-center gap-2 text-royal-700">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-royal-600 text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-semibold">Invite ready for {created.email}</span>
              </div>
              <p className="mt-2 text-sm text-muted">
                In production this link is emailed automatically. You can also copy it and send it
                yourself:
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink">
                  {linkFor(created.token)}
                </code>
                <button
                  type="button"
                  onClick={() => copyLink(created.token)}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-royal-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-royal-700"
                >
                  {copiedToken === created.token ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedToken === created.token ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Sent invites (from the database) */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <h3 className="font-display text-lg">Sent invites</h3>
          <Badge tone="royal">{pendingCount} pending</Badge>
        </div>

        {invites.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">
            No invites yet. Send your first one above.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-ink">
                      {[inv.firstName, inv.lastName].filter(Boolean).join(" ") || inv.email}
                    </span>
                    <Badge tone={statusTone[inv.status]}>{inv.status.toLowerCase()}</Badge>
                  </div>
                  <div className="mt-0.5 truncate text-sm text-muted">
                    {inv.firstName || inv.lastName ? `${inv.email} · ` : ""}
                    {inv.plan} · {timeAgo(inv.createdAt)}
                  </div>
                </div>

                {inv.status === "PENDING" && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyLink(inv.token)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink transition-colors hover:bg-paper"
                    >
                      {copiedToken === inv.token ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5" />
                      )}
                      {copiedToken === inv.token ? "Copied" : "Copy link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => revoke(inv.token)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-muted transition-colors hover:border-red-200 hover:text-red-600"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Revoke
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
