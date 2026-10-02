"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/** Spotify's official mark, used to link to Spotify content (their brand rules). */
function SpotifyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.601.301.96zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.72 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

/**
 * Spotify's embeddable resource types. A *user profile* is deliberately absent:
 * Spotify has no embed for profiles, so those fall back to a link.
 */
const EMBEDDABLE = new Set(["playlist", "album", "track", "artist", "show", "episode"]);

/** open.spotify.com/playlist/abc -> open.spotify.com/embed/playlist/abc */
export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("spotify.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    // Locale-prefixed links look like /intl-de/playlist/abc
    const start = parts[0]?.startsWith("intl-") ? 1 : 0;
    const [type, id] = [parts[start], parts[start + 1]];
    if (!type || !id || !EMBEDDABLE.has(type)) return null;
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
  } catch {
    return null;
  }
}

/**
 * The coach's music at the top of the session. An embedded player when the link
 * is a playlist/album/track; a tidy link when it's a profile (Spotify can't
 * embed those). Collapsed by default so it never gets between her and her sets.
 */
export function SpotifyPanel({ url }: { url: string }) {
  const embed = toEmbedUrl(url);
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <button
        type="button"
        onClick={() => (embed ? setOpen((v) => !v) : window.open(url, "_blank", "noopener"))}
        aria-expanded={embed ? open : undefined}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-emerald-50/40"
      >
        <SpotifyMark className="h-9 w-9 shrink-0 text-[#1DB954]" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg leading-tight text-ink">
            Need something to listen to?
          </span>
          <span className="block text-xs text-muted">Check out these playlists now.</span>
        </span>
        {embed ? (
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-muted transition-transform", open && "rotate-180")}
          />
        ) : (
          <ExternalLink className="h-4 w-4 shrink-0 text-muted" />
        )}
      </button>

      {embed && open && (
        <div className="border-t border-line p-3">
          <iframe
            src={embed}
            title="Spotify player"
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
          />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-royal-700 hover:text-royal-800"
          >
            Open in Spotify
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
