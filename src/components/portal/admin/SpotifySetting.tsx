"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Music } from "lucide-react";
import { Card } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";

/**
 * Millie's Spotify link. Shows on every client's Today page as a "training
 * music" button - optional, and cleared by emptying the field.
 */
export function SpotifySetting() {
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings/spotify")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { url?: string } | null) => setUrl(d?.url ?? ""))
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/settings/spotify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) setSaved(true);
      else setError((await res.text()) || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1DB954] text-white">
          <Music className="h-4 w-4" />
        </span>
        Training music
      </h2>
      <p className="mt-1.5 text-sm text-muted">
        Paste your Spotify profile or a playlist link and clients get a one-tap button on their Today page. Leave it
        empty to hide it.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setSaved(false);
          }}
          placeholder="https://open.spotify.com/user/..."
          className="h-11 flex-1 rounded-xl border border-line bg-paper px-3.5 text-sm text-ink placeholder:text-muted/60 focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-royal-500/10"
        />
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {saved && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
          <Check className="h-4 w-4" />
          Saved
        </p>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-royal-700 hover:text-royal-800"
        >
          Check the link opens correctly
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </Card>
  );
}
