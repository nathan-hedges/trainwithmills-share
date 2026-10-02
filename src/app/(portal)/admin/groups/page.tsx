"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ExternalLink,
  LayoutTemplate,
  MessageCircle,
  Pencil,
  Plus,
  GripVertical,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Badge, Card, PageHeading } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/portal/ConfirmDialog";
import { GroupChat } from "@/components/portal/group/GroupChat";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

const GROUP_CAP = 12;
const PROGRAMME_DAYS = 42;

interface Member {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  programmePaidAt: string | null;
  status: string;
  sessionsDone?: number;
  sessionsPlanned?: number;
  thisWeekDone?: number;
  thisWeekPlanned?: number;
}
interface Lesson {
  id: string;
  title: string;
  notes: string;
  link: string | null;
  createdAt: string;
}
interface GroupRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  callSchedule: string | null;
  callLink: string | null;
  members: Member[];
  lessons: Lesson[];
  status: "upcoming" | "running" | "finished";
  week: number;
  messageCount: number;
  lastMessageAt: string | null;
}
interface TemplateOption {
  id: string;
  name: string;
}

const fullName = (m: Member) => [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email;

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Day 42 - the last training day (day 1 = the start date). */
function lastDay(startIso: string): string {
  const d = new Date(startIso);
  d.setUTCDate(d.getUTCDate() + PROGRAMME_DAYS - 1);
  return d.toISOString();
}

/** Snap any picked date to the Monday of its week (templates run Mon-Sun). */
function mondayOf(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

const STATUS: Record<GroupRow["status"], { label: string; tone: string }> = {
  upcoming: { label: "Not started", tone: "neutral" },
  running: { label: "Running", tone: "green" },
  finished: { label: "Finished", tone: "amber" },
};

/** "3 days ago" / "just now" - enough for spotting a quiet group. */
function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const field =
  "h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink transition-colors focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15";
const areaField =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink transition-colors focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15";

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`max-h-[90dvh] w-full ${wide ? "max-w-lg" : "max-w-md"} overflow-y-auto rounded-2xl bg-white shadow-elevated`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** A client you can pick up and drop onto a group. */
function DraggableClient({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        // touch-none stops the browser scrolling instead of dragging on a phone.
        "touch-none",
        isDragging && "opacity-40",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A group card (or the waiting list) you can drop a client onto. */
function DropZone({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-2xl transition-shadow",
        isOver && "ring-2 ring-royal-400 ring-offset-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [unassigned, setUnassigned] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/edit group modal
  const [editing, setEditing] = useState<GroupRow | "new" | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [callSchedule, setCallSchedule] = useState("");
  const [callLink, setCallLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Feature modals (each holds the group they're open for)
  const [confirm, setConfirm] = useState<GroupRow | null>(null);
  const [chatFor, setChatFor] = useState<GroupRow | null>(null);
  const [lessonsFor, setLessonsFor] = useState<GroupRow | null>(null);
  const [applyFor, setApplyFor] = useState<GroupRow | null>(null);

  // Lessons modal state
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonNotes, setLessonNotes] = useState("");
  const [lessonLink, setLessonLink] = useState("");
  const [lessonSaving, setLessonSaving] = useState(false);

  // Apply-template modal state
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [applyWeek, setApplyWeek] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState("");

  // Drag to place clients. A small distance/delay before a drag starts so taps
  // and scrolls still behave normally on a phone.
  const [dragging, setDragging] = useState<Member | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  /** Everyone currently on screen, so a drag can find who was picked up. */
  function findMember(id: string): Member | null {
    return (
      unassigned.find((m) => m.id === id) ??
      groups.flatMap((g) => g.members).find((m) => m.id === id) ??
      null
    );
  }

  function onDragStart(e: DragStartEvent) {
    setDragging(findMember(String(e.active.id)));
  }

  async function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const clientId = String(e.active.id);
    const target = e.over ? String(e.over.id) : null;
    if (!target) return;

    const from = groups.find((g) => g.members.some((m) => m.id === clientId));
    if (target === "unassigned") {
      if (from) await removeMember(from.id, clientId);
      return;
    }
    if (from?.id === target) return; // dropped back where it started
    await addMember(target, clientId);
  }

  async function load() {
    const res = await fetch("/api/groups");
    if (res.ok) {
      const d = await res.json();
      setGroups(d.groups);
      setUnassigned(d.unassigned);
      // Keep any open lessons modal in sync after a change.
      setLessonsFor((prev) => (prev ? d.groups.find((g: GroupRow) => g.id === prev.id) ?? null : null));
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function openModal(g: GroupRow | "new") {
    setEditing(g);
    setError("");
    if (g === "new") {
      setName("");
      setStartDate("");
      setCallSchedule("");
      setCallLink("");
    } else {
      setName(g.name);
      setStartDate(g.startDate.split("T")[0]);
      setCallSchedule(g.callSchedule ?? "");
      setCallLink(g.callLink ?? "");
    }
  }

  async function saveGroup() {
    if (!name.trim() || !startDate) {
      setError("A name and a start date are both needed.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(editing === "new" ? "/api/groups" : `/api/groups/${(editing as GroupRow).id}`, {
        method: editing === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          startDate,
          callSchedule: callSchedule.trim() || null,
          callLink: callLink.trim() || null,
        }),
      });
      if (res.ok) {
        setEditing(null);
        await load();
      } else {
        setError((await res.text()) || "Could not save the group.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeGroup(g: GroupRow) {
    const res = await fetch(`/api/groups/${g.id}`, { method: "DELETE" });
    if (res.ok) await load();
    setConfirm(null);
  }

  async function addMember(groupId: string, clientId: string) {
    // The cap is Millie's to enforce - so warn, don't block.
    const target = groups.find((g) => g.id === groupId);
    if (
      target &&
      target.members.length >= GROUP_CAP &&
      !target.members.some((m) => m.id === clientId) &&
      !window.confirm(
        `${target.name} already has ${target.members.length} members. The Strong Girl Project is sold as "capped at 12" - add anyway?`,
      )
    ) {
      return;
    }

    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    if (res.ok) await load();
  }

  async function removeMember(groupId: string, clientId: string) {
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    if (res.ok) await load();
  }

  async function addLesson() {
    if (!lessonsFor || !lessonTitle.trim() || !lessonNotes.trim()) return;
    setLessonSaving(true);
    try {
      const res = await fetch(`/api/groups/${lessonsFor.id}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lessonTitle.trim(),
          notes: lessonNotes.trim(),
          link: lessonLink.trim() || null,
        }),
      });
      if (res.ok) {
        setLessonTitle("");
        setLessonNotes("");
        setLessonLink("");
        await load();
      }
    } finally {
      setLessonSaving(false);
    }
  }

  async function removeLesson(groupId: string, lessonId: string) {
    const res = await fetch(`/api/groups/${groupId}/lessons/${lessonId}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  function openApply(g: GroupRow) {
    setApplyFor(g);
    setTemplateId("");
    setApplyWeek(mondayOf(new Date().toISOString().split("T")[0]));
    setApplyResult("");
    if (templates.length === 0) {
      fetch("/api/templates")
        .then((r) => (r.ok ? r.json() : []))
        .then((d: TemplateOption[]) => setTemplates(d))
        .catch(() => {});
    }
  }

  async function applyTemplate() {
    if (!applyFor || !templateId || !applyWeek) return;
    setApplying(true);
    setApplyResult("");
    try {
      const res = await fetch(`/api/groups/${applyFor.id}/apply-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, weekStart: mondayOf(applyWeek) }),
      });
      if (res.ok) {
        const d = await res.json();
        setApplyResult(`Done - applied to ${d.applied} of ${d.of} members.`);
      } else {
        setApplyResult((await res.text()) || "The apply failed.");
      }
    } finally {
      setApplying(false);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
    <div className="space-y-6">
      <PageHeading
        title="Groups"
        subtitle="Strong Girl Project cohorts - everyone in a group starts together and finishes after 6 weeks."
      >
        <Button onClick={() => openModal("new")} size="sm">
          <Plus className="h-4 w-4" />
          New group
        </Button>
      </PageHeading>

      {/* Paid clients waiting for a group - also a drop target, so you can pull
          someone back out of a group. */}
      {unassigned.length > 0 && (
        <DropZone id="unassigned">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-royal-600" />
            <h2 className="font-medium text-ink">Waiting for a group</h2>
            <Badge tone="royal">{unassigned.length}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Strong Girl clients not yet placed in a group. Their 6 weeks only start once you place them.
          </p>
          <ul className="mt-3 divide-y divide-line">
            {unassigned.map((m) => (
              <li key={m.id}>
                <DraggableClient
                  id={m.id}
                  className="flex cursor-grab flex-wrap items-center gap-2 rounded-lg py-2.5 active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted" />
                  <span className="font-medium text-ink">{fullName(m)}</span>
                  {m.programmePaidAt ? (
                    <Badge tone="green">Paid {fmt(m.programmePaidAt)}</Badge>
                  ) : (
                    <Badge tone="amber">Not paid yet</Badge>
                  )}
                </DraggableClient>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Drag someone onto a group below to place them.</p>
        </Card>
        </DropZone>
      )}

      {loading ? (
        <Card className="p-10 text-center text-muted">Loading groups…</Card>
      ) : groups.length === 0 ? (
        <Card className="p-10 text-center text-muted">
          No groups yet. Create one with its start date, then place paid Strong Girl clients in it.
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((g) => {
            const over = g.members.length > GROUP_CAP;
            return (
              <DropZone key={g.id} id={g.id}>
              <Card className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg leading-tight">{g.name}</h3>
                      <Badge tone={STATUS[g.status].tone}>
                        {g.status === "running" ? `Week ${g.week} of 6` : STATUS[g.status].label}
                      </Badge>
                    </div>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {fmt(g.startDate)} – {fmt(lastDay(g.startDate))}
                    </p>
                    {g.callSchedule && (
                      <p className="mt-0.5 text-xs text-muted">Weekly call: {g.callSchedule}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openModal(g)}
                      aria-label={`Edit ${g.name}`}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-royal-50 hover:text-ink"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirm(g)}
                      aria-label={`Delete ${g.name}`}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted" />
                  <span className="text-sm text-muted">
                    {g.members.length}/{GROUP_CAP}
                  </span>
                  {over && <Badge tone="amber">Over the cap</Badge>}
                </div>

                {g.members.length > 0 && (
                  <ul className="mt-3 divide-y divide-line">
                    {g.members.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2">
                        <DraggableClient
                          id={m.id}
                          className="flex cursor-grab items-center gap-2 active:cursor-grabbing"
                        >
                          <GripVertical className="h-4 w-4 shrink-0 text-muted" />
                          <span className="text-sm font-medium text-ink">{fullName(m)}</span>
                        </DraggableClient>
                        {!m.programmePaidAt && <Badge tone="amber">Not paid</Badge>}

                        {/* How she's actually training this programme */}
                        {g.status !== "upcoming" && (m.sessionsPlanned ?? 0) > 0 && (
                          <span className="text-xs text-muted">
                            {m.sessionsDone}/{m.sessionsPlanned} sessions
                            {(m.thisWeekPlanned ?? 0) > 0 && (
                              <span className={cn((m.thisWeekDone ?? 0) === 0 && "text-amber-600")}>
                                {" "}
                                · {m.thisWeekDone}/{m.thisWeekPlanned} this week
                              </span>
                            )}
                          </span>
                        )}
                        {g.status !== "upcoming" && (m.sessionsPlanned ?? 0) === 0 && (
                          <span className="text-xs text-amber-600">No sessions programmed</span>
                        )}

                        <span className="ml-auto flex items-center gap-1">
                          <Link
                            href={`/admin/clients/${m.id}`}
                            className="text-xs font-semibold text-royal-700 hover:text-royal-800"
                          >
                            Open
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeMember(g.id, m.id)}
                            aria-label={`Remove ${fullName(m)} from ${g.name}`}
                            className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {g.members.length === 0 && (
                  <p className="mt-3 rounded-xl border border-dashed border-line p-3 text-center text-xs text-muted">
                    No members yet - place paid clients from the list above.
                  </p>
                )}

                {/* Group tools */}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  <button
                    type="button"
                    onClick={() => setChatFor(g)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-royal-50"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-royal-600" />
                    Chat
                    {g.messageCount > 0 && <Badge tone="neutral">{g.messageCount}</Badge>}
                  </button>
                  {g.lastMessageAt && (
                    <span className="self-center text-[11px] text-muted">last message {ago(g.lastMessageAt)}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setLessonsFor(g);
                      setLessonTitle("");
                      setLessonNotes("");
                      setLessonLink("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-royal-50"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-royal-600" />
                    Lessons
                    {g.lessons.length > 0 && <Badge tone="royal">{g.lessons.length}</Badge>}
                  </button>
                  <button
                    type="button"
                    onClick={() => openApply(g)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-royal-50"
                  >
                    <LayoutTemplate className="h-3.5 w-3.5 text-royal-600" />
                    Apply template
                  </button>
                </div>
              </Card>
              </DropZone>
            );
          })}
        </div>
      )}

      {/* Create / edit modal */}
      {editing && (
        <Modal title={editing === "new" ? "New group" : "Edit group"} onClose={() => setEditing(null)}>
          <div className="p-5">
            <label className="block text-sm font-medium text-ink">
              Group name
              <input
                className={`mt-1 ${field}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. September Strong Girls"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-ink">
              Start date (day 1)
              <input
                type="date"
                className={`mt-1 ${field}`}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            {startDate && (
              <p className="mt-2 text-xs text-muted">
                Access ends after {fmt(lastDay(`${startDate}T00:00:00Z`))} (day {PROGRAMME_DAYS}).
              </p>
            )}
            <label className="mt-3 block text-sm font-medium text-ink">
              Weekly call time <span className="font-normal text-muted">(optional)</span>
              <input
                className={`mt-1 ${field}`}
                value={callSchedule}
                onChange={(e) => setCallSchedule(e.target.value)}
                placeholder="e.g. Wednesdays 7pm"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-ink">
              Call link <span className="font-normal text-muted">(optional - Zoom/Meet)</span>
              <input
                className={`mt-1 ${field}`}
                value={callLink}
                onChange={(e) => setCallLink(e.target.value)}
                placeholder="https://zoom.us/j/…"
              />
            </label>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={saveGroup} disabled={saving}>
                {saving ? "Saving…" : "Save group"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Chat modal */}
      {chatFor && (
        <Modal title={`${chatFor.name} - group chat`} onClose={() => setChatFor(null)} wide>
          <GroupChat endpoint={`/api/groups/${chatFor.id}/messages`} canDelete className="h-[28rem]" />
        </Modal>
      )}

      {/* Lessons modal */}
      {lessonsFor && (
        <Modal title={`${lessonsFor.name} - lessons`} onClose={() => setLessonsFor(null)} wide>
          <div className="space-y-4 p-5">
            <div className="rounded-xl border border-line bg-paper p-4">
              <h3 className="text-sm font-medium text-ink">Post this week&apos;s lesson</h3>
              <input
                className={`mt-2 ${field}`}
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Title - e.g. Week 2: Progressive overload explained"
              />
              <textarea
                className={`mt-2 ${areaField}`}
                rows={4}
                value={lessonNotes}
                onChange={(e) => setLessonNotes(e.target.value)}
                placeholder="The lesson notes your group can revisit any time…"
              />
              <input
                className={`mt-2 ${field}`}
                value={lessonLink}
                onChange={(e) => setLessonLink(e.target.value)}
                placeholder="Optional link (slides, video, article)"
              />
              <div className="mt-3 flex justify-end">
                <Button size="sm" onClick={addLesson} disabled={lessonSaving || !lessonTitle.trim() || !lessonNotes.trim()}>
                  {lessonSaving ? "Posting…" : "Post lesson"}
                </Button>
              </div>
            </div>

            {lessonsFor.lessons.length === 0 ? (
              <p className="text-center text-sm text-muted">No lessons posted yet.</p>
            ) : (
              <ul className="space-y-3">
                {lessonsFor.lessons.map((l) => (
                  <li key={l.id} className="rounded-xl border border-line p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-ink">{l.title}</h4>
                        <p className="mt-1 whitespace-pre-line text-sm text-muted">{l.notes}</p>
                        {l.link && (
                          <a
                            href={l.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-royal-700 hover:text-royal-800"
                          >
                            Open link
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLesson(lessonsFor.id, l.id)}
                        aria-label={`Delete ${l.title}`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Modal>
      )}

      {/* Apply template modal */}
      {applyFor && (
        <Modal title={`${applyFor.name} - apply a template week`} onClose={() => setApplyFor(null)}>
          <div className="p-5">
            <p className="text-sm text-muted">
              Stamps the template onto <span className="font-medium text-ink">every member</span> for the chosen week -
              replacing whatever that week already has, exactly like the individual apply.
            </p>
            <label className="mt-4 block text-sm font-medium text-ink">
              Template
              <select className={`mt-1 ${field}`} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">Choose a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-medium text-ink">
              Week
              <input
                type="date"
                className={`mt-1 ${field}`}
                value={applyWeek}
                onChange={(e) => setApplyWeek(e.target.value)}
              />
            </label>
            {applyWeek && (
              <p className="mt-1.5 text-xs text-muted">
                Applies to the week starting Monday {fmt(`${mondayOf(applyWeek)}T00:00:00Z`)}.
              </p>
            )}
            {applyResult && <p className="mt-3 text-sm font-medium text-ink">{applyResult}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setApplyFor(null)}>
                Close
              </Button>
              <Button onClick={applyTemplate} disabled={applying || !templateId || !applyWeek}>
                {applying ? "Applying…" : `Apply to ${applyFor.members.length} members`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <DragOverlay>
        {dragging && (
          <span className="rounded-full bg-royal-600 px-3 py-1.5 text-sm font-semibold text-white shadow-elevated">
            {fullName(dragging)}
          </span>
        )}
      </DragOverlay>

      {confirm && (
        <ConfirmDialog
          title="Delete group?"
          message={`"${confirm.name}" will be removed, along with its chat and lessons. Its members aren't deleted - they just become unassigned again.`}
          confirmLabel="Delete"
          onConfirm={() => removeGroup(confirm)}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
    </DndContext>
  );
}
