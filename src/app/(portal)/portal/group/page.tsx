"use client";

import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, Crown, ExternalLink, MessageCircle, Trophy, Users, Video } from "lucide-react";
import { Badge, Card, PageHeading, ProgressBar } from "@/components/portal/primitives";
import { GroupChat } from "@/components/portal/group/GroupChat";
import { Avatar } from "@/components/shared/Placeholder";
import { cn } from "@/lib/utils";

interface GroupData {
  group: {
    name: string;
    startDate: string;
    callSchedule: string | null;
    callLink: string | null;
    memberCount: number;
  };
  weekNumber: number;
  totalWeeks: number;
  startISO: string;
  endISO: string;
  leaderboard: { id: string; name: string; hasAvatar?: boolean; mine: boolean; total: number; thisWeek: number }[];
  wins: { name: string; exercise: string; weight: number }[];
  lessons: { id: string; title: string; notes: string; link: string | null; createdAt: string }[];
}

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const medalTone = ["text-gold-500", "text-slate-400", "text-amber-700"];

export default function MyGroupPage() {
  const [data, setData] = useState<GroupData | null>(null);
  const [state, setState] = useState<"loading" | "none" | "ready">("loading");

  useEffect(() => {
    let active = true;
    fetch("/api/me/group")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: GroupData | null) => {
        if (!active) return;
        if (d) {
          setData(d);
          setState("ready");
        } else {
          setState("none");
        }
      })
      .catch(() => active && setState("none"));
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") {
    return <Card className="p-10 text-center text-muted">Loading your group…</Card>;
  }
  if (state === "none" || !data) {
    return (
      <div className="space-y-6">
        <PageHeading title="My Group" />
        <Card className="p-10 text-center text-muted">
          You&apos;re not in a group yet - I&apos;ll place you in one and confirm your start date.
        </Card>
      </div>
    );
  }

  const pct = Math.round((data.weekNumber / data.totalWeeks) * 100);

  return (
    <div className="space-y-6">
      <PageHeading
        title={data.group.name}
        subtitle={`${fmtDay(data.startISO)} - ${fmtDay(data.endISO)} · ${data.group.memberCount} of you getting strong together`}
      />

      {/* Week progress + call details */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <CalendarDays className="h-4 w-4 text-royal-600" />
              Week {data.weekNumber} of {data.totalWeeks}
            </div>
            <span className="text-xs text-muted">{pct}%</span>
          </div>
          <ProgressBar value={pct} className="mt-3" />
          <p className="mt-2 text-xs text-muted">Six weeks, one session at a time - keep showing up.</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <Video className="h-4 w-4 text-royal-600" />
            Weekly group call
          </div>
          {data.group.callSchedule || data.group.callLink ? (
            <>
              {data.group.callSchedule && <p className="mt-2 text-sm text-ink">{data.group.callSchedule}</p>}
              {data.group.callLink && (
                <a
                  href={data.group.callLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-royal-700 hover:text-royal-800"
                >
                  Join the call
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">I&apos;ll share the call time and link here.</p>
          )}
        </Card>
      </div>

      {/* Recent wins */}
      {data.wins.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <Trophy className="h-4 w-4 text-gold-500" />
            Recent wins
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.wins.map((w) => (
              <Badge key={`${w.name}-${w.exercise}`} tone="gold">
                {w.name} - {w.exercise} {w.weight}kg PB
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* Leaderboard */}
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <Users className="h-4 w-4 text-royal-600" />
            Leaderboard
            <span className="ml-auto text-xs font-normal text-muted">sessions completed</span>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {data.leaderboard.map((row, i) => (
              <li
                key={row.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2.5",
                  row.mine && "bg-royal-50/70",
                )}
              >
                <span className="grid w-6 shrink-0 place-items-center">
                  {i < 3 ? (
                    <Crown className={cn("h-4 w-4", medalTone[i])} />
                  ) : (
                    <span className="text-xs tabular-nums text-muted">{i + 1}</span>
                  )}
                </span>
                <Avatar
                  initials={row.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  userId={row.id}
                  hasAvatar={row.hasAvatar}
                  className="h-7 w-7 shrink-0 text-[10px]"
                />
                <span className={cn("min-w-0 flex-1 truncate text-sm", row.mine ? "font-semibold text-ink" : "text-ink")}>
                  {row.name}
                  {row.mine && <span className="ml-1.5 text-xs font-normal text-royal-700">(you)</span>}
                </span>
                {row.thisWeek > 0 && (
                  <span className="text-xs text-muted">+{row.thisWeek} this week</span>
                )}
                <span className="font-display text-lg tabular-nums text-ink">{row.total}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Counted from completed sessions during the programme - every session you finish moves you up.
          </p>
        </Card>

        {/* Lessons */}
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <BookOpen className="h-4 w-4 text-royal-600" />
            Weekly lessons
          </div>
          {data.lessons.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              After each group call, I post the week&apos;s mini lesson here so you can revisit it any time.
            </p>
          ) : (
            <ul className="mt-3 space-y-4">
              {data.lessons.map((l) => (
                <li key={l.id} className="rounded-xl border border-line bg-paper p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-medium text-ink">{l.title}</h3>
                    <span className="shrink-0 text-[11px] text-muted">
                      {new Date(l.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-sm text-muted">{l.notes}</p>
                  {l.link && (
                    <a
                      href={l.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-royal-700 hover:text-royal-800"
                    >
                      Open the link
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Group chat */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-medium text-ink">
          <MessageCircle className="h-4 w-4 text-royal-600" />
          Group chat
          <span className="ml-auto text-xs font-normal text-muted">you, the group &amp; me</span>
        </div>
        <GroupChat endpoint="/api/me/group/messages" className="h-[28rem]" />
      </Card>
    </div>
  );
}
