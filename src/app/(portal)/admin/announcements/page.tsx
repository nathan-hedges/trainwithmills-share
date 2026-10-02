"use client";

import { useEffect, useState } from "react";
import { Megaphone, Mic, Send, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Card, PageHeading } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import { VoiceRecorder, type RecordedAudio } from "@/components/portal/admin/VoiceRecorder";
import { VoiceNotePlayer } from "@/components/portal/VoiceNotePlayer";

interface Announcement {
  id: string;
  message: string;
  showUntil: string;
  createdAt: string;
  audioKey: string | null;
  audioSeconds: number | null;
  groupId: string | null;
  clientId: string | null;
  group: { name: string } | null;
  client: { firstName: string | null; lastName: string | null } | null;
}
interface GroupOption {
  id: string;
  name: string;
  members: { id: string; firstName: string | null; lastName: string | null; email: string }[];
}
interface ClientOption {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

const field =
  "h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15";

function defaultUntil() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export default function AnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [message, setMessage] = useState("");
  const [showUntil, setShowUntil] = useState(defaultUntil());
  const [sendEmails, setSendEmails] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Audience: "" = everyone, "group:<id>", "client:<id>"
  const [audience, setAudience] = useState("");
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);

  const [recording, setRecording] = useState<RecordedAudio | null>(null);

  async function load() {
    const res = await fetch("/api/announcements");
    if (res.ok) setList(await res.json());
  }
  useEffect(() => {
    load();
    fetch("/api/groups")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { groups?: GroupOption[] } | null) => setGroups(d?.groups ?? []))
      .catch(() => {});
    fetch("/api/clients")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: ClientOption[]) => setClients(d))
      .catch(() => {});
  }, []);

  /** Upload the recording to R2 and hand back its key. */
  async function uploadVoiceNote(audio: RecordedAudio): Promise<string | null> {
    const res = await fetch("/api/announcements/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: audio.mimeType, ext: audio.ext, size: audio.blob.size }),
    });
    if (!res.ok) {
      setError((await res.text()) || "Could not prepare the upload.");
      return null;
    }
    const { uploadUrl, key } = await res.json();
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": audio.mimeType },
      body: audio.blob,
    });
    if (!put.ok) {
      setError("The recording didn't upload - check your connection and try again.");
      return null;
    }
    return key as string;
  }

  async function send() {
    if ((!message.trim() && !recording) || sending) return;
    setSending(true);
    setError("");
    try {
      let audioKey: string | null = null;
      if (recording) {
        audioKey = await uploadVoiceNote(recording);
        if (!audioKey) return; // upload failed - error already shown
      }

      const [kind, id] = audience.split(":");
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          showUntil,
          // Emails only make sense for a written broadcast to everyone.
          sendEmails: sendEmails && audience === "" && Boolean(message.trim()),
          audioKey,
          audioSeconds: recording?.seconds ?? null,
          groupId: kind === "group" ? id : null,
          clientId: kind === "client" ? id : null,
        }),
      });
      if (res.ok) {
        setMessage("");
        setRecording(null);
        await load();
      } else {
        setError((await res.text()) || "Could not send.");
      }
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    if (res.ok) setList((p) => p.filter((a) => a.id !== id));
  }

  const now = Date.now();

  return (
    <div className="space-y-6">
      <PageHeading
        title="Announcements"
        subtitle="Send a note or a voice message - to everyone, one group, or a single client. It shows in their portal until the date you set."
      />

      <Card className="p-5">
        <label htmlFor="ann-msg" className="mb-1.5 block text-sm font-medium text-ink">Message</label>
        <textarea
          id="ann-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="e.g. The studio is closed Bank Holiday Monday - online sessions run as normal."
          className={cn(field, "h-auto resize-none py-2")}
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink">
            <span className="mb-1.5 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-royal-600" />
              Who gets this?
            </span>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className={field}>
              <option value="">Everyone</option>
              {groups.length > 0 && (
                <optgroup label="A group">
                  {groups.map((g) => (
                    <option key={g.id} value={`group:${g.id}`}>
                      {g.name} ({g.members.length})
                    </option>
                  ))}
                </optgroup>
              )}
              {clients.length > 0 && (
                <optgroup label="One client">
                  {clients.map((c) => (
                    <option key={c.id} value={`client:${c.id}`}>
                      {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
        </div>

        {/* Voice note - the weekly "well done, keep going" without typing it */}
        <div className="mt-3">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink">
            <Mic className="h-3.5 w-3.5 text-royal-600" />
            Voice note <span className="font-normal text-muted">(optional)</span>
          </span>
          <VoiceRecorder
            recording={recording}
            onRecorded={setRecording}
            onClear={() => setRecording(null)}
            disabled={sending}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <label className="text-sm font-medium text-ink">
            Show until
            <input
              type="date"
              value={showUntil}
              onChange={(e) => setShowUntil(e.target.value)}
              className={cn(field, "mt-1 block")}
            />
          </label>
          <Button onClick={send} disabled={(!message.trim() && !recording) || sending}>
            <Send className="h-4 w-4" />
            {sending
              ? "Sending…"
              : audience.startsWith("group:")
                ? "Send to the group"
                : audience.startsWith("client:")
                  ? "Send to this client"
                  : "Send to everyone"}
          </Button>
        </div>

        {audience === "" && message.trim() ? (
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={sendEmails}
              onChange={(e) => setSendEmails(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-royal-600"
            />
            <span>
              Also email this to every client
              <span className="block text-xs font-normal text-muted">
                Untick to show it only in the portal - no emails go out.
              </span>
            </span>
          </label>
        ) : (
          <p className="mt-3 text-xs text-muted">
            {audience === ""
              ? "Voice notes are portal-only - clients get a notification telling them it's waiting."
              : "Targeted notes are portal-only, so nobody outside the audience is emailed."}
          </p>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      <div>
        <h2 className="mb-3 font-display text-xl">Recent</h2>
        {list.length === 0 ? (
          <Card className="p-8 text-center text-muted">No announcements yet.</Card>
        ) : (
          <div className="space-y-3">
            {list.map((a) => {
              const active = new Date(a.showUntil).getTime() > now;
              return (
                <Card key={a.id} className="flex items-start gap-3 p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600">
                    {a.audioKey ? <Mic className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    {a.message && <p className="whitespace-pre-line text-sm text-ink">{a.message}</p>}
                    {a.audioKey && (
                      <div className={cn(a.message && "mt-2")}>
                        <VoiceNotePlayer audioKey={a.audioKey} seconds={a.audioSeconds} label="Voice note" />
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <Badge tone={active ? "green" : "neutral"}>{active ? "Active" : "Expired"}</Badge>
                      <Badge tone="royal">
                        {a.client
                          ? [a.client.firstName, a.client.lastName].filter(Boolean).join(" ") || "One client"
                          : a.group
                            ? a.group.name
                            : "Everyone"}
                      </Badge>
                      Showing until{" "}
                      {new Date(a.showUntil).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    aria-label="Delete announcement"
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
