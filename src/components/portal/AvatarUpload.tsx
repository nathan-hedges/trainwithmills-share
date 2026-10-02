"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/shared/Placeholder";
import { cn } from "@/lib/utils";

/** Square output size. Plenty for a 96px avatar on a 3x screen. */
const OUTPUT = 512;
const VIEWPORT = 260;

interface Loaded {
  img: HTMLImageElement;
  /** Scale at which the image exactly covers the square viewport. */
  baseScale: number;
}

/**
 * Pick a photo, drag to position it and zoom, then upload the square crop.
 * Cropping happens on a canvas in the browser, so a 12MP phone photo is never
 * uploaded - only the 512px square she chose.
 */
export function AvatarUpload({
  initials,
  userId,
  hasAvatar,
  onChanged,
}: {
  initials: string;
  /** Present once she has a picture - used to show the current one. */
  userId?: string;
  hasAvatar?: boolean;
  onChanged?: (hasAvatar: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0); // cache-buster after a change

  function pick(file: File) {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file.");
      return;
    }
    const img = new Image();
    img.onload = () => {
      // Cover the square: the smaller side fills the viewport.
      const baseScale = VIEWPORT / Math.min(img.width, img.height);
      setLoaded({ img, baseScale });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.onerror = () => setError("That image couldn't be read.");
    img.src = URL.createObjectURL(file);
  }

  function startDrag(e: React.PointerEvent) {
    if (!loaded) return;
    frameRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onDrag(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || !loaded) return;
    const scale = loaded.baseScale * zoom;
    const w = loaded.img.width * scale;
    const h = loaded.img.height * scale;
    // Never let the image pull away from the edges of the square.
    const maxX = Math.max(0, (w - VIEWPORT) / 2);
    const maxY = Math.max(0, (h - VIEWPORT) / 2);
    const nx = Math.min(maxX, Math.max(-maxX, d.ox + (e.clientX - d.x)));
    const ny = Math.min(maxY, Math.max(-maxY, d.oy + (e.clientY - d.y)));
    setOffset({ x: nx, y: ny });
  }
  function endDrag() {
    dragRef.current = null;
  }

  /** Render the visible square to a canvas at OUTPUT size. */
  function toBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!loaded) return resolve(null);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);

      const scale = loaded.baseScale * zoom;
      const w = loaded.img.width * scale;
      const h = loaded.img.height * scale;
      // Where the image sits inside the viewport, scaled up to OUTPUT.
      const k = OUTPUT / VIEWPORT;
      const dx = (VIEWPORT / 2 - w / 2 + offset.x) * k;
      const dy = (VIEWPORT / 2 - h / 2 + offset.y) * k;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT, OUTPUT);
      ctx.drawImage(loaded.img, dx, dy, w * k, h * k);
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
    });
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const blob = await toBlob();
      if (!blob) {
        setError("Couldn't prepare that image.");
        return;
      }
      const res = await fetch("/api/me/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "image/jpeg", ext: "jpg", size: blob.size }),
      });
      if (!res.ok) {
        setError((await res.text()) || "Couldn't start the upload.");
        return;
      }
      const { uploadUrl, key } = await res.json();
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!put.ok) {
        setError("The upload didn't go through - check your connection.");
        return;
      }
      const saved = await fetch("/api/me/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!saved.ok) {
        setError("Couldn't save your picture.");
        return;
      }
      setLoaded(null);
      setVersion((v) => v + 1);
      onChanged?.(true);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await fetch("/api/me/avatar", { method: "DELETE" });
      setVersion((v) => v + 1);
      onChanged?.(false);
    } finally {
      setBusy(false);
    }
  }

  // ── Cropping ──
  if (loaded) {
    const scale = loaded.baseScale * zoom;
    return (
      <div>
        <div
          ref={frameRef}
          onPointerDown={startDrag}
          onPointerMove={onDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative mx-auto touch-none overflow-hidden rounded-full border-2 border-royal-300 bg-paper"
          style={{ width: VIEWPORT, height: VIEWPORT, cursor: "grab" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={loaded.img.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
            style={{
              width: loaded.img.width * scale,
              height: loaded.img.height * scale,
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
            }}
          />
        </div>

        <label className="mt-4 block text-sm font-medium text-ink">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-1 w-full accent-royal-600"
          />
        </label>
        <p className="text-xs text-muted">Drag the photo to position it.</p>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Use this photo"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setLoaded(null)} disabled={busy}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ── Idle ──
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar
        initials={initials}
        userId={userId}
        hasAvatar={hasAvatar}
        version={version}
        className="h-20 w-20 text-xl"
      />
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
            e.target.value = "";
          }}
        />
        <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {hasAvatar ? "Change photo" : "Add a photo"}
        </Button>
        {hasAvatar && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold text-muted",
              "transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50",
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>
      {error && (
        <p className="flex w-full items-center gap-1.5 text-sm text-red-600">
          <X className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}
