"use client";

import { useEffect, useState } from "react";
import { Megaphone, Mic } from "lucide-react";
import { VoiceNotePlayer } from "./VoiceNotePlayer";

interface Active {
  message: string;
  audioKey: string | null;
  audioSeconds: number | null;
}

/**
 * The active announcement at the top of the portal - a written note, a voice
 * note from Millie, or both. Scoped to this user (personal, then their group,
 * then everyone) by the API. Not dismissible, per the coach's choice.
 */
export function AnnouncementBanner() {
  const [active, setActive] = useState<Active | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/announcements/active")
      .then((r) => (r.ok ? r.json() : null))
      .then((a: Active | null) => {
        if (alive && a && (a.message || a.audioKey)) setActive(a);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!active) return null;

  return (
    <div className="flex flex-wrap items-start gap-2.5 border-b border-gold-400/30 bg-gold-100/50 px-4 py-2.5 text-sm text-royal-950 sm:px-6 lg:px-8">
      {active.audioKey ? (
        <Mic className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
      ) : (
        <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
      )}
      <div className="min-w-0 flex-1">
        {active.message && <p className="whitespace-pre-line">{active.message}</p>}
        {active.audioKey && (
          <div className={active.message ? "mt-2" : undefined}>
            <VoiceNotePlayer
              audioKey={active.audioKey}
              seconds={active.audioSeconds}
              label="Voice note"
            />
          </div>
        )}
      </div>
    </div>
  );
}
