"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarHeart, ChevronRight, Clock, Sparkles, TrendingDown, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/portal/primitives";
import { Avatar } from "@/components/shared/Placeholder";

interface Flagged {
  id: string;
  name: string;
  initials: string;
  reasons: { type: string; label: string }[];
}

const reasonStyle: Record<string, { icon: typeof Clock; cls: string }> = {
  inactive: { icon: Clock, cls: "border-amber-200 bg-amber-50 text-amber-700" },
  video: { icon: Video, cls: "border-royal-200 bg-royal-50 text-royal-700" },
  adherence: { icon: TrendingDown, cls: "border-red-200 bg-red-50 text-red-600" },
  // Cycle context is coaching information, not a problem - keep it soft.
  cycle: { icon: CalendarHeart, cls: "border-royal-200 bg-white text-royal-700" },
};

export function NeedsAttention() {
  const [list, setList] = useState<Flagged[] | null>(null);

  useEffect(() => {
    fetch("/api/clients/needs-attention")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Flagged[]) => setList(d))
      .catch(() => setList([]));
  }, []);

  if (list === null) return null;

  if (list.length === 0) {
    return (
      <Card className="flex items-center gap-3 border-emerald-200 bg-emerald-50/50 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-emerald-600" />
        <span className="text-sm font-medium text-emerald-800">
          Everyone&apos;s on track - nothing needs your attention right now.
        </span>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-amber-200">
      <div className="flex items-center gap-2 border-b border-line bg-amber-50/50 px-5 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <h2 className="font-display text-lg">Needs attention</h2>
        <span className="ml-auto text-sm font-medium text-muted">{list.length}</span>
      </div>
      <ul className="divide-y divide-line">
        {list.map((c) => (
          <li key={c.id}>
            <Link
              href={`/admin/clients/${c.id}`}
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-paper"
            >
              <Avatar initials={c.initials} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink">{c.name}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.reasons.map((r, i) => {
                    const st = reasonStyle[r.type] ?? reasonStyle.inactive;
                    const Icon = st.icon;
                    return (
                      <span
                        key={i}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          st.cls,
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {r.label}
                      </span>
                    );
                  })}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
