"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Eye, Pencil } from "lucide-react";
import { fullName, initialsOf } from "@/lib/portal/types";
import type { ClientAnalytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/Placeholder";
import { Badge, Card, ProgressBar } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import { ClientOverview } from "@/components/portal/admin/ClientOverview";
import { ProgrammingPanel } from "@/components/portal/admin/ProgrammingPanel";
import { ClientLoggedSessions } from "@/components/portal/admin/ClientLoggedSessions";
import { ClientNutritionPanel } from "@/components/portal/admin/ClientNutritionPanel";
import { CoachNotes } from "@/components/portal/admin/CoachNotes";
import { ClientCycleCard } from "@/components/portal/admin/ClientCycleCard";
import { ClientIntakeCard, InjuryBanner } from "@/components/portal/admin/ClientIntakeCard";
import { ManageClientModal, type ManagedClient } from "@/components/portal/admin/ManageClientModal";

interface ClientDetail extends ManagedClient {
  email: string;
}

const TABS = ["overview", "programming", "logged", "nutrition", "notes"] as const;
type Tab = (typeof TABS)[number];

export default function ClientPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const clientId = params.clientId;
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if ((TABS as readonly string[]).includes(hash)) setTab(hash as Tab);
  }, []);

  const loadClient = useCallback(async () => {
    if (!clientId) return;
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (res.ok) setClient(await res.json());
    } catch (error) {
      console.error("Failed to load client:", error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const loadAnalytics = useCallback(async () => {
    if (!clientId) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/analytics`);
      if (res.ok) setAnalytics(await res.json());
    } catch {
      /* analytics are best-effort */
    }
  }, [clientId]);

  useEffect(() => {
    loadClient();
    loadAnalytics();
  }, [loadClient, loadAnalytics]);

  if (loading) {
    return <Card className="p-8 text-center text-muted">Loading client…</Card>;
  }

  if (!client) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted">Client not found.</p>
        <Link href="/admin" className="mt-2 inline-block font-semibold text-royal-700">
          Back to dashboard
        </Link>
      </Card>
    );
  }

  const paused = client.status === "paused";
  const adherence = analytics?.adherence ?? 0;

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All clients
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar initials={initialsOf(client)} className="h-14 w-14 text-lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl tracking-tight">{fullName(client)}</h1>
                {client.plan && <Badge tone="royal">{client.plan}</Badge>}
                {paused && <Badge tone="amber">Paused</Badge>}
              </div>
              <p className="text-sm text-muted">
                {client.goal || "No goal set"}
                {client.program ? ` · ${client.program}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-xs text-muted">Adherence</div>
              <div className="mt-1 flex items-center gap-2">
                <ProgressBar value={adherence} className="w-24" />
                <span className="text-sm font-semibold">{adherence}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setManaging(true)} size="sm">
                <Pencil className="h-4 w-4" />
                Manage
              </Button>
              <Button
                onClick={() => router.push(`/portal?preview=${clientId}`)}
                variant="secondary"
                size="sm"
              >
                <Eye className="h-4 w-4" />
                View as client
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-1 rounded-full border border-line bg-white p-1 sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-full px-5 py-2 text-sm font-medium capitalize transition-colors sm:flex-none",
              t === tab ? "bg-royal-600 text-white" : "text-muted hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-5">
          {analytics ? (
            <ClientOverview firstName={client.firstName || "this client"} analytics={analytics} clientId={clientId} />
          ) : (
            <Card className="p-8 text-center text-muted">Loading insights…</Card>
          )}
          <ClientIntakeCard client={client} />
          {/* Renders nothing unless she's tracking - see the component. */}
          <ClientCycleCard clientId={clientId} />
        </div>
      )}
      {tab === "programming" && (
        <div className="space-y-4">
          {/* Injuries in front of her while she picks exercises, not buried. */}
          <InjuryBanner injuries={client.injuries} />
          <ProgrammingPanel clientId={clientId} />
        </div>
      )}
      {tab === "logged" && <ClientLoggedSessions clientId={clientId} />}
      {tab === "nutrition" && <ClientNutritionPanel clientId={clientId} />}
      {tab === "notes" && <CoachNotes clientId={clientId} />}

      {managing && (
        <ManageClientModal
          client={client}
          onSaved={(updated) => setClient((prev) => ({ ...prev!, ...updated }))}
          onClose={() => setManaging(false)}
        />
      )}
    </div>
  );
}
