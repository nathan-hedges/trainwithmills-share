"use client";

import { useEffect, useState } from "react";
import { Lock, Pin, PinOff, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";

interface Note {
  id: string;
  text: string;
  pinned: boolean;
  createdAt: string;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function CoachNotes({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/clients/${clientId}/notes`);
    if (res.ok) setNotes(await res.json());
    else setNotes([]);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function add() {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (res.ok) {
        const note = (await res.json()) as Note;
        setNotes((prev) => [note, ...(prev ?? [])]);
        setText("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(n: Note) {
    setNotes((prev) => (prev ? prev.map((x) => (x.id === n.id ? { ...x, pinned: !x.pinned } : x)) : prev));
    await fetch(`/api/clients/${clientId}/notes/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !n.pinned }),
    });
    load(); // re-sort (pinned first)
  }

  async function remove(id: string) {
    setNotes((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
    await fetch(`/api/clients/${clientId}/notes/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
          <Lock className="h-3.5 w-3.5" />
          Private - only you can see these.
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="e.g. Prefers morning sessions. Knee flare-up in Feb - avoid deep lunges. Motivated by the 5k goal."
          className="w-full resize-none rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-royal-400 focus:bg-white focus:outline-none"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={add} disabled={!text.trim() || saving}>
            {saving ? "Saving…" : "Add note"}
          </Button>
        </div>
      </Card>

      {notes === null ? (
        <Card className="p-8 text-center text-muted">Loading notes…</Card>
      ) : notes.length === 0 ? (
        <Card className="p-8 text-center text-muted">No notes yet - jot down anything you want to remember.</Card>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Card key={n.id} className={cn("flex items-start gap-3 p-4", n.pinned && "border-gold-300/60 bg-gold-100/30")}>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-line text-sm text-ink">{n.text}</p>
                <div className="mt-1 text-xs text-muted">{fmt(n.createdAt)}</div>
              </div>
              <button
                type="button"
                onClick={() => togglePin(n)}
                aria-label={n.pinned ? "Unpin note" : "Pin note"}
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-paper",
                  n.pinned ? "text-gold-600" : "text-muted hover:text-ink",
                )}
              >
                {n.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => remove(n.id)}
                aria-label="Delete note"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
