"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Inbox, TrendingUp, Users } from "lucide-react";
import { PageHeading, StatCard } from "@/components/portal/primitives";
import { ClientsTable, type ClientRow } from "@/components/portal/admin/ClientsTable";
import { NeedsAttention } from "@/components/portal/admin/NeedsAttention";

export default function AdminDashboardPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);

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

  const active = clients.filter((c) => c.status !== "paused").length;
  const sessionsToday = clients.filter((c) => c.today !== "rest").length;
  const avgAdherence = Math.round(
    clients.reduce((n, c) => n + (c.adherence ?? 0), 0) / Math.max(1, clients.length),
  );
  const toReview = clients.filter((c) => c.today === "assigned" || c.today === "in_progress").length;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Coaching dashboard"
        subtitle="Your roster at a glance - assign, track and review."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active clients" value={active} sublabel={`${clients.length} total`} icon={Users} />
        <StatCard label="Sessions today" value={sessionsToday} sublabel="assigned" icon={ClipboardList} />
        <StatCard label="Avg adherence" value={`${avgAdherence}%`} sublabel="this week" icon={TrendingUp} tone="gold" />
        <StatCard label="To review" value={toReview} sublabel="awaiting logs" icon={Inbox} />
      </div>

      <NeedsAttention />

      <div>
        <h2 className="mb-3 font-display text-xl">Your clients</h2>
        <ClientsTable />
      </div>
    </div>
  );
}
