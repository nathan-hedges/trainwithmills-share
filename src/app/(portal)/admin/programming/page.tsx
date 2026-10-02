"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { fullName, initialsOf } from "@/lib/portal/types";
import { shortPlan } from "@/lib/portal/plan";
import { Avatar } from "@/components/shared/Placeholder";
import { Badge, Card, PageHeading } from "@/components/portal/primitives";
import type { ClientRow } from "@/components/portal/admin/ClientsTable";
import { cn } from "@/lib/utils";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ProgrammingPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/clients")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ClientRow[]) => {
        if (active) setClients(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const today = toISO(new Date());
  const base = new Date(`${today}T00:00:00`);
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { iso: toISO(d), label: DOW[i] };
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? clients.filter((c) => fullName(c).toLowerCase().includes(q)) : clients;
  }, [clients, query]);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Programming"
        subtitle="This week across your roster - open a client to build their sessions."
      />

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

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted">No clients yet.</Card>
        ) : (
          filtered.map((c) => {
            const days = c.weekDays ?? [];
            const assigned = week.filter((d) => days.includes(d.iso)).length;
            return (
              <Card key={c.id} className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar initials={initialsOf(c)} className="h-10 w-10 text-sm" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{fullName(c)}</span>
                        {c.plan && <Badge tone="royal">{shortPlan(c.plan)}</Badge>}
                      </div>
                      <div className="text-xs text-muted">
                        {c.program || "No programme"} · {assigned} {assigned === 1 ? "day" : "days"} this week
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="flex gap-1">
                      {week.map((d) => {
                        const has = days.includes(d.iso);
                        const isToday = d.iso === today;
                        return (
                          <div
                            key={d.iso}
                            className={cn(
                              "grid h-8 w-8 place-items-center rounded-lg border text-[11px] font-semibold",
                              has
                                ? "border-royal-600 bg-royal-600 text-white"
                                : isToday
                                  ? "border-gold-400 text-muted"
                                  : "border-line text-muted",
                            )}
                          >
                            {d.label}
                          </div>
                        );
                      })}
                    </div>
                    <Link
                      href={`/admin/clients/${c.id}#programming`}
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-royal-700 hover:text-royal-800"
                    >
                      Program
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
