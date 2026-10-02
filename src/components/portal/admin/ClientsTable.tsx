"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { fullName, initialsOf } from "@/lib/portal/types";
import { planPriority, shortPlan } from "@/lib/portal/plan";
import { isOneOffPlan, programmeEnded } from "@/lib/billing";
import { Avatar } from "@/components/shared/Placeholder";
import { Badge, Card, ProgressBar } from "../primitives";

/** The client shape returned by GET /api/clients (now with real adherence + today). */
export interface ClientRow {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  plan?: string | null;
  goal?: string | null;
  program?: string | null;
  status?: string | null;
  billingExempt?: boolean;
  subscriptionStatus?: string | null;
  avatarKey?: string | null;
  programmePaidAt?: string | null;
  group?: { name: string; startDate: string } | null;
  adherence: number;
  today: string; // rest | assigned | in_progress | completed
  weekDays?: string[]; // ISO dates this week that have a session
}

/** Payment-state chip: only shown when something needs attention. */
function PaymentBadge({ c }: { c: ClientRow }) {
  if (c.billingExempt) return null;
  // Strong Girl clients have no subscription - judge the one-off programme.
  if (isOneOffPlan(c.plan)) {
    if (!c.programmePaidAt) return <Badge tone="amber">Unpaid</Badge>;
    if (c.group && programmeEnded(new Date(c.group.startDate)))
      return <Badge tone="neutral">Programme ended</Badge>;
    if (!c.group) return <Badge tone="royal">Needs a group</Badge>;
    return null; // paid + in a live group = all good
  }
  const s = c.subscriptionStatus;
  if (s === "past_due" || s === "unpaid") return <Badge tone="red">Past due</Badge>;
  if (s === "canceled") return <Badge tone="neutral">Cancelled</Badge>;
  if (!s || s === "incomplete") return <Badge tone="amber">Unpaid</Badge>;
  return null; // active/trialing = all good, no noise
}

function statusInfo(today: string): { label: string; tone: string } {
  if (today === "completed") return { label: "Completed", tone: "green" };
  if (today === "in_progress") return { label: "In progress", tone: "amber" };
  if (today === "assigned") return { label: "Assigned", tone: "royal" };
  return { label: "Rest day", tone: "neutral" };
}

function PlanBadge({ plan, paused }: { plan?: string | null; paused: boolean }) {
  if (paused) return <Badge tone="amber">Paused</Badge>;
  if (!plan) return <span className="text-xs text-muted">No plan</span>;
  return <Badge tone={planPriority(plan).tone}>{shortPlan(plan)}</Badge>;
}

export function ClientsTable() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/clients")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ClientRow[]) => {
        if (active) setClients(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => !q || fullName(c).toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .sort((a, b) => {
        const paused = Number(a.status === "paused") - Number(b.status === "paused");
        if (paused !== 0) return paused;
        return planPriority(a.plan).rank - planPriority(b.plan).rank;
      });
  }, [clients, query]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients"
          className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm text-ink placeholder:text-muted/60 focus:border-royal-400 focus:outline-none focus:ring-4 focus:ring-royal-500/10"
        />
      </div>

      <Card className="overflow-hidden">
        {/* Desktop table */}
        <table className="hidden w-full text-sm md:table">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-semibold">Client</th>
              <th className="px-5 py-3 font-semibold">Plan</th>
              <th className="px-5 py-3 font-semibold">Adherence</th>
              <th className="px-5 py-3 font-semibold">Today</th>
              <th className="px-5 py-3">
                <span className="sr-only">Manage</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted">
                  {loading ? "Loading clients…" : "No clients yet. Invite your first client to get started."}
                </td>
              </tr>
            )}
            {rows.map((c) => {
              const st = statusInfo(c.today);
              return (
                <tr
                  key={c.id}
                  className="border-b border-line/70 transition-colors last:border-0 hover:bg-royal-50/40"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar initials={initialsOf(c)} userId={c.id} hasAvatar={Boolean(c.avatarKey)} className="h-9 w-9 text-xs" />
                      <div>
                        <div className="font-medium text-ink">{fullName(c)}</div>
                        <div className="text-xs text-muted">{c.goal || c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <PlanBadge plan={c.plan} paused={c.status === "paused"} />
                      <PaymentBadge c={c} />
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={c.adherence} className="w-24" />
                      <span className="font-medium tabular-nums">{c.adherence}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/clients/${c.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-royal-700 hover:text-royal-800"
                    >
                      Manage
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="divide-y divide-line md:hidden">
          {rows.length === 0 && (
            <p className="p-6 text-center text-sm text-muted">
              {loading ? "Loading clients…" : "No clients yet. Invite your first client to get started."}
            </p>
          )}
          {rows.map((c) => {
            const st = statusInfo(c.today);
            return (
              <Link
                key={c.id}
                href={`/admin/clients/${c.id}`}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-royal-50/40"
              >
                <Avatar initials={initialsOf(c)} userId={c.id} hasAvatar={Boolean(c.avatarKey)} className="h-10 w-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-ink">{fullName(c)}</span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <PlanBadge plan={c.plan} paused={c.status === "paused"} />
                    <PaymentBadge c={c} />
                    <span className="text-xs text-muted">{c.adherence}% adherence</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
