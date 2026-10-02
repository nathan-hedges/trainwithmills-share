"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/Placeholder";

export interface GroupChatMessage {
  id: string;
  text: string;
  createdAt: string;
  mine: boolean;
  sender: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    avatarKey?: string | null;
  };
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" });

/** Two-letter initials for the little face beside a message. */
function initialsFor(m: GroupChatMessage) {
  if (m.sender.role === "COACH") return "M";
  return ((m.sender.firstName?.[0] ?? "") + (m.sender.lastName?.[0] ?? "")).toUpperCase() || "?";
}

function senderLabel(m: GroupChatMessage) {
  if (m.sender.role === "COACH") return "Millie";
  const first = m.sender.firstName?.trim();
  const lastInitial = m.sender.lastName?.trim()?.[0];
  return first ? (lastInitial ? `${first} ${lastInitial}.` : first) : "A member";
}

/**
 * The group chat thread - text only, polled every 10s. Used by the client
 * My Group page and (with canDelete) the coach's group chat modal.
 */
export function GroupChat({
  endpoint,
  canDelete = false,
  className,
}: {
  /** GET (list) + POST (send) both go here; DELETE goes to `${endpoint}/${id}`. */
  endpoint: string;
  canDelete?: boolean;
  className?: string;
}) {
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const rows: GroupChatMessage[] = await res.json();
        setMessages(rows);
      }
    } catch {
      /* transient network issue - the next poll retries */
    }
    setLoaded(true);
  }, [endpoint]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  // Only scroll when something new arrives (not on every poll).
  useEffect(() => {
    if (messages.length !== countRef.current) {
      countRef.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        setMessages(await res.json());
        setDraft("");
      }
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!loaded ? (
          <p className="py-8 text-center text-sm text-muted">Loading the chat…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            Nothing here yet - say hi and get the group going!
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("group flex gap-2", m.mine ? "justify-end" : "justify-start")}>
              {!m.mine && (
                <Avatar
                  initials={initialsFor(m)}
                  userId={m.sender.id}
                  hasAvatar={Boolean(m.sender.avatarKey)}
                  className="mt-4 h-7 w-7 shrink-0 text-[10px]"
                />
              )}
              <div className={cn("max-w-[80%]", m.mine && "text-right")}>
                {!m.mine && (
                  <div
                    className={cn(
                      "mb-0.5 text-[11px] font-semibold",
                      m.sender.role === "COACH" ? "text-gold-600" : "text-royal-700",
                    )}
                  >
                    {senderLabel(m)}
                  </div>
                )}
                <div className="flex items-end gap-1.5">
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => remove(m.id)}
                      aria-label="Delete message"
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100",
                        m.mine && "order-first",
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <div
                    className={cn(
                      "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm",
                      m.mine
                        ? "rounded-br-md bg-royal-600 text-white"
                        : m.sender.role === "COACH"
                          ? "rounded-bl-md border border-gold-500/40 bg-gold-100/60 text-ink"
                          : "rounded-bl-md bg-paper text-ink",
                    )}
                  >
                    {m.text}
                  </div>
                </div>
                <div className="mt-0.5 text-[10px] text-muted/80">{fmtTime(m.createdAt)}</div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Message the group…"
          className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15"
        />
        <button
          type="button"
          onClick={send}
          disabled={!draft.trim() || sending}
          aria-label="Send"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-royal-600 text-white transition-colors hover:bg-royal-700 disabled:opacity-40"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}
