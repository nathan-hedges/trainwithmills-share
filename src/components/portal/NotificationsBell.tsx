"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, Check, Clock, MessageSquare, Trophy, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notif {
  id: string;
  type: string;
  title: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const ICONS: Record<string, { icon: LucideIcon; chip: string }> = {
  message: { icon: MessageSquare, chip: "bg-royal-50 text-royal-600" },
  reminder: { icon: Clock, chip: "bg-amber-50 text-amber-600" },
  summary: { icon: TrendingUp, chip: "bg-emerald-50 text-emerald-600" },
  milestone: { icon: Trophy, chip: "bg-gold-100 text-gold-600" },
  alert: { icon: AlertTriangle, chip: "bg-red-50 text-red-600" },
};
const FALLBACK = { icon: Bell, chip: "bg-slate-100 text-slate-600" };

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const unread = items.filter((n) => !n.read).length;

  const load = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Notif[]) => setItems(data))
      .catch(() => {});
  }, []);

  // Load on mount; refresh whenever the panel is opened.
  useEffect(() => {
    load();
  }, [load]);

  function toggle() {
    setOpen((v) => {
      if (!v) load();
      return !v;
    });
  }

  function markAllRead() {
    setItems((p) => p.map((n) => ({ ...n, read: true })));
    fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
  }

  function openNotif(n: Notif) {
    if (!n.read) {
      setItems((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      fetch(`/api/notifications/${n.id}`, { method: "PATCH" }).catch(() => {});
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-muted transition-colors hover:text-ink"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-gold-500 text-[9px] font-bold text-royal-950">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            aria-label="Close notifications"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-elevated">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-display text-base">Notifications</span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-xs font-medium text-royal-700 hover:text-royal-800"
                >
                  <Check className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 divide-y divide-line overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted">You&apos;re all caught up.</p>
              ) : (
                items.map((n) => {
                  const s = ICONS[n.type] ?? FALLBACK;
                  const Icon = s.icon;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openNotif(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-royal-50/40",
                        !n.read && "bg-royal-50/30",
                      )}
                    >
                      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", s.chip)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-ink">{n.title}</span>
                        <span className="text-xs text-muted">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
