"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Paperclip, Send, ThumbsUp, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressVideo } from "@/lib/compressVideo";
import { MAX_SOURCE_BYTES, MAX_SOURCE_MB, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/uploads";
import type { MessageDTO, Verdict } from "@/lib/messages/types";

const verdictBadge: Record<Verdict, { label: string; cls: string }> = {
  good: { label: "Looks good", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  needs_work: { label: "Needs work", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

function VideoMessage({ videoKey }: { videoKey: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/video?key=${encodeURIComponent(videoKey)}`);
      if (res.ok) setUrl((await res.json()).url);
    } finally {
      setLoading(false);
    }
  }

  if (url) return <video src={url} controls className="mt-1 w-full max-w-[260px] rounded-xl bg-black" />;
  return (
    <button
      type="button"
      onClick={load}
      disabled={loading}
      className="mt-1 flex items-center gap-2 rounded-xl border border-line bg-white/80 px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-white"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
      {loading ? "Loading…" : "Play video"}
    </button>
  );
}

export function MessageThread({ clientId, canSendVideo = true }: { clientId?: string; canSendVideo?: boolean }) {
  const isCoachView = clientId != null;
  const base = `/api/messages${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ""}`;

  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState<"compressing" | "uploading" | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetch(base)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: MessageDTO[]) => setMessages(d))
      .catch(() => {});
  }, [base]);

  // Load on mount + when switching thread, and poll for new messages.
  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  // Draft persistence: whatever's typed survives refreshes, navigation and lost
  // signal - per thread, on this device. Cleared when the message sends.
  const draftKey = `twm-msg-draft:${clientId ?? "me"}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) setDraft(saved);
    } catch {
      /* storage unavailable - fine */
    }
  }, [draftKey]);
  useEffect(() => {
    try {
      if (draft) localStorage.setItem(draftKey, draft);
      else localStorage.removeItem(draftKey);
    } catch {
      /* storage unavailable - fine */
    }
  }, [draft, draftKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(body: { text?: string; videoKey?: string }) {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, ...(clientId ? { clientId } : {}) }),
    });
    if (res.ok) {
      setDraft("");
      load();
    } else {
      setError("Couldn't send. Try again.");
    }
  }

  async function sendText() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await send({ text: draft.trim() });
    } finally {
      setBusy(false);
    }
  }

  async function sendVideo(file: File) {
    if (!file.type.startsWith("video/")) {
      setError("Please choose a video file.");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError(`That video is over ${MAX_SOURCE_MB} MB - please film a shorter clip.`);
      return;
    }

    setUploading(true);
    setError("");
    setProgress(0);
    try {
      // 1) Shrink the video in the browser before it ever leaves the device.
      setStage("compressing");
      let blob: Blob;
      try {
        blob = await compressVideo(file, setProgress);
      } catch {
        setError("Couldn't process this video. Try a shorter or lower-resolution clip.");
        return;
      }
      if (blob.size > MAX_UPLOAD_BYTES) {
        setError(`Even after compression this video is over ${MAX_UPLOAD_MB} MB. Try a shorter clip.`);
        return;
      }

      // 2) Get a presigned URL (declaring the compressed size for the server cap).
      setStage("uploading");
      const presign = await fetch("/api/messages/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "video/mp4", ext: "mp4", size: blob.size }),
      });
      if (!presign.ok) {
        setError((await presign.text()) || "Couldn't start the upload.");
        return;
      }
      const { uploadUrl, key } = await presign.json();

      // 3) Upload the compressed mp4 straight to R2.
      const put = await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "video/mp4" } });
      if (!put.ok) {
        setError("Upload failed. Please try again.");
        return;
      }
      await send({ videoKey: key });
    } finally {
      setUploading(false);
      setStage(null);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function setVerdict(id: string, verdict: Verdict, note: string) {
    const res = await fetch(`/api/messages/${id}/verdict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdict, note }),
    });
    if (res.ok) load();
  }

  return (
    <div className="flex h-[calc(100dvh-12rem)] flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">No messages yet. Say hello 👋</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm",
                m.mine ? "bg-royal-600 text-white" : "bg-paper text-ink",
              )}
            >
              {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
              {m.videoKey && <VideoMessage videoKey={m.videoKey} />}

              {/* Verdict shown to everyone once set */}
              {m.verdict && (
                <div className={cn("mt-2 inline-flex flex-col gap-0.5 rounded-lg border px-2.5 py-1.5 text-xs", verdictBadge[m.verdict].cls)}>
                  <span className="inline-flex items-center gap-1 font-semibold">
                    {m.verdict === "good" ? <ThumbsUp className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {verdictBadge[m.verdict].label}
                  </span>
                  {m.verdictNote && <span className="font-normal">{m.verdictNote}</span>}
                </div>
              )}

              {/* Coach can review the client's (unjudged) videos */}
              {isCoachView && m.senderRole === "client" && m.videoKey && !m.verdict && (
                <VerdictControls onSet={(v, note) => setVerdict(m.id, v, note)} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-xs font-medium text-red-600">{error}</p>}
      {uploading && (
        <p className="px-4 pb-1 text-xs font-medium text-royal-600">
          {stage === "compressing" ? `Compressing video… ${progress}%` : "Uploading video…"}
        </p>
      )}

      <div className="flex items-end gap-2 border-t border-line p-3">
        {canSendVideo && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && sendVideo(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Attach video"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-muted transition-colors hover:text-ink disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </button>
          </>
        )}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendText();
            }
          }}
          rows={1}
          placeholder={
            stage === "compressing"
              ? `Compressing… ${progress}%`
              : stage === "uploading"
                ? "Uploading video…"
                : "Type a message…"
          }
          className="max-h-28 flex-1 resize-none rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-royal-400 focus:bg-white focus:outline-none"
        />
        <button
          type="button"
          onClick={sendText}
          disabled={!draft.trim() || busy}
          aria-label="Send"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-royal-600 text-white transition-colors hover:bg-royal-700 disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function VerdictControls({ onSet }: { onSet: (v: Verdict, note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <div className="mt-2 space-y-1.5 border-t border-white/20 pt-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note…"
        className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink focus:outline-none"
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onSet("good", note)}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          <ThumbsUp className="h-3.5 w-3.5" /> Looks good
        </button>
        <button
          type="button"
          onClick={() => onSet("needs_work", note)}
          className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600"
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Needs work
        </button>
      </div>
    </div>
  );
}
