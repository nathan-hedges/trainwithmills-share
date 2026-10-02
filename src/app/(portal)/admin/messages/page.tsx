"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/Placeholder";
import { Card, PageHeading } from "@/components/portal/primitives";
import { MessageThread } from "@/components/portal/messages/MessageThread";
import type { ThreadSummary } from "@/lib/messages/types";

function shortTime(iso: string | null) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function CoachMessagesPage() {
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [active, setActive] = useState<ThreadSummary | null>(null);

  useEffect(() => {
    let on = true;
    const load = () =>
      fetch("/api/messages/threads")
        .then((r) => (r.ok ? r.json() : []))
        .then((d: ThreadSummary[]) => on && setThreads(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeading title="Messages" subtitle="Your client conversations and form-check videos." />

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        {/* Thread list */}
        <Card className={cn("h-fit overflow-hidden p-0", active && "hidden lg:block")}>
          {threads === null ? (
            <p className="p-6 text-center text-sm text-muted">Loading…</p>
          ) : threads.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">No clients yet.</p>
          ) : (
            <div className="max-h-[calc(100dvh-12rem)] divide-y divide-line overflow-y-auto">
              {threads.map((t) => (
                <button
                  key={t.clientId}
                  type="button"
                  onClick={() => setActive(t)}
                  className={cn(
                    "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-royal-50/40",
                    active?.clientId === t.clientId && "bg-royal-50/60",
                  )}
                >
                  <Avatar initials={t.initials} className="h-10 w-10 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-ink">{t.clientName}</span>
                      <span className="shrink-0 text-[11px] text-muted">{shortTime(t.lastAt)}</span>
                    </div>
                    <div className="truncate text-xs text-muted">{t.lastMessage || "No messages yet"}</div>
                  </div>
                  {t.unread > 0 && (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-royal-950">
                      {t.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Active conversation */}
        <div className={cn(!active && "hidden lg:block")}>
          {active ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActive(null)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                All chats
              </button>
              <div className="hidden text-sm font-medium text-ink lg:block">{active.clientName}</div>
              <MessageThread clientId={active.clientId} />
            </div>
          ) : (
            <Card className="grid h-[calc(100dvh-12rem)] place-items-center text-center">
              <div className="text-muted">
                <MessageSquare className="mx-auto h-7 w-7 text-royal-300" />
                <p className="mt-2 text-sm">Select a conversation to start.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
