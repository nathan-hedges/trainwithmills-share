"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** mm:ss */
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Pick a container the browser can actually record. Safari differs from Chrome. */
function bestMimeType(): { mimeType: string; ext: string } | null {
  const options: { mimeType: string; ext: string }[] = [
    { mimeType: "audio/webm", ext: "webm" },
    { mimeType: "audio/mp4", ext: "mp4" },
    { mimeType: "audio/ogg", ext: "ogg" },
  ];
  if (typeof MediaRecorder === "undefined") return null;
  return options.find((o) => MediaRecorder.isTypeSupported(o.mimeType)) ?? null;
}

export interface RecordedAudio {
  blob: Blob;
  ext: string;
  mimeType: string;
  seconds: number;
  url: string;
}

/**
 * Record a short voice note in the browser. Hands the finished clip back to the
 * parent, which uploads it - this component only deals with the microphone.
 */
export function VoiceRecorder({
  recording,
  onRecorded,
  onClear,
  disabled,
}: {
  recording: RecordedAudio | null;
  onRecorded: (audio: RecordedAudio) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Never leave the mic hot if the component goes away mid-recording.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        rec.stop();
        rec.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function start() {
    setError("");
    const choice = bestMimeType();
    if (!choice) {
      setError("This browser can't record audio - try Chrome or Safari.");
      return;
    }
    // getUserMedia only exists in a secure context (https, or localhost).
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        window.isSecureContext
          ? "This browser doesn't support recording."
          : "Recording needs a secure connection - open the site over https (or localhost).",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: choice.mimeType });
      chunksRef.current = [];
      let elapsed = 0;

      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: choice.mimeType });
        onRecorded({
          blob,
          ext: choice.ext,
          mimeType: choice.mimeType,
          seconds: elapsed,
          url: URL.createObjectURL(blob),
        });
        setBusy(false);
        setSeconds(0);
      };

      rec.start();
      recorderRef.current = rec;
      setBusy(true);
      timerRef.current = setInterval(() => {
        elapsed += 1;
        setSeconds(elapsed);
        if (elapsed >= 300) rec.stop(); // hard stop at 5 minutes
      }, 1000);
    } catch (err) {
      // Say which of the several very different causes it actually was.
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") {
        setError(
          "Microphone access was blocked. Click the padlock in the address bar, allow the microphone, then reload.",
        );
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No microphone found - check one is plugged in and selected in your system settings.");
      } else if (name === "NotReadableError") {
        setError("Your microphone is busy in another app - close that and try again.");
      } else {
        setError("I couldn't start recording. Reload the page and try once more.");
      }
    }
  }

  function stop() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  if (recording) {
    return (
      <div className="rounded-xl border border-line bg-paper p-3.5">
        <div className="flex items-center gap-3">
          <audio
            controls
            controlsList="nodownload noplaybackrate noremoteplayback"
            src={recording.url}
            className="h-10 min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            aria-label="Delete recording and start again"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {clock(recording.seconds)} recorded - have a listen before you send it.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-paper p-3.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={busy ? stop : start}
          disabled={disabled}
          className={cn(
            "inline-flex min-h-[2.75rem] items-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50",
            busy ? "bg-red-600 hover:bg-red-700" : "bg-royal-600 hover:bg-royal-700",
          )}
        >
          {busy ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {busy ? "Stop" : "Record a voice note"}
        </button>
        {busy && (
          <span className="inline-flex items-center gap-2 text-sm tabular-nums text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            {clock(seconds)}
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {!error && !busy && (
        <p className="mt-1.5 text-xs text-muted">Up to 5 minutes. You can listen back before sending.</p>
      )}
    </div>
  );
}
