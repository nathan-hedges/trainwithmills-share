"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/** mm:ss */
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Plays a voice note stored privately in R2.
 *
 * Deliberately not the browser's default <audio controls>: that brings a
 * download button and a playback-speed menu, and looks nothing like the rest of
 * the portal. This is a play/pause button, a scrubber and a timer.
 *
 * The signed URL is fetched on first play, so opening a page never leaks
 * playable links.
 */
export function VoiceNotePlayer({
  audioKey,
  seconds,
  label = "Voice note",
  className,
}: {
  audioKey: string;
  seconds?: number | null;
  label?: string;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Fall back to the duration recorded at upload until the file reports its own.
  const [duration, setDuration] = useState(seconds ?? 0);
  const [error, setError] = useState("");

  async function toggle() {
    setError("");

    // First press: fetch the signed URL, then play once it's attached.
    if (!url) {
      setLoading(true);
      try {
        const res = await fetch(`/api/announcements/audio?key=${encodeURIComponent(audioKey)}`);
        if (!res.ok) {
          setError("Couldn't load this recording.");
          return;
        }
        const d = await res.json();
        setUrl(d.url);
        // The <audio> mounts with this URL; play it on the next tick.
        requestAnimationFrame(() => void audioRef.current?.play());
      } catch {
        setError("Couldn't load this recording.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  function scrub(e: React.ChangeEvent<HTMLInputElement>) {
    const el = audioRef.current;
    if (!el) return;
    const to = Number(e.target.value);
    el.currentTime = to;
    setElapsed(to);
  }

  const total = duration || seconds || 0;
  const pct = total > 0 ? (elapsed / total) * 100 : 0;

  return (
    <div className={cn("w-full max-w-xs", className)}>
      {/* One compact row: button, scrubber, time. */}
      <div className="flex items-center gap-2.5 rounded-full border border-line bg-white py-1.5 pl-1.5 pr-3">
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          aria-label={playing ? `Pause ${label}` : `Play ${label}`}
          title={label}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-royal-600 text-white transition-colors hover:bg-royal-700 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : playing ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="ml-0.5 h-3.5 w-3.5" />
          )}
        </button>

        <Mic className="h-3.5 w-3.5 shrink-0 text-gold-600" />

        {/* Scrubber - a range input styled as a slim track. */}
        <div className="relative h-1 min-w-0 flex-1">
          <div className="absolute inset-0 rounded-full bg-line" />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-royal-500 transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
          <input
            type="range"
            min={0}
            max={total || 1}
            step={0.1}
            value={elapsed}
            onChange={scrub}
            disabled={!url}
            aria-label="Seek"
            className="absolute -inset-y-2 inset-x-0 w-full cursor-pointer opacity-0 disabled:cursor-default"
          />
        </div>

        <span className="shrink-0 text-[11px] tabular-nums text-muted">
          {url ? clock(elapsed) : total ? clock(total) : "--:--"}
        </span>
      </div>

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setElapsed(0);
          }}
          onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            // Some webm recordings report Infinity until they're seeked.
            if (Number.isFinite(d) && d > 0) setDuration(d);
          }}
          className="hidden"
        />
      )}
    </div>
  );
}
