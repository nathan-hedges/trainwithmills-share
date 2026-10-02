"use client";

import { useEffect, useState } from "react";
import { Check, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { ClientOption } from "@/lib/forms/types";

const field =
  "h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink focus:border-royal-400 focus:bg-white focus:outline-none";

export function AssignFormModal({
  formId,
  formTitle,
  onClose,
  onAssigned,
}: {
  formId: string;
  formTitle: string;
  onClose: () => void;
  onAssigned?: () => void;
}) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string; members: unknown[] }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [everyone, setEveryone] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [cadence, setCadence] = useState<"none" | "weekly" | "monthly">("none");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/forms/clients")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: ClientOption[]) => setClients(d))
      .catch(() => {});
    fetch("/api/groups")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { groups?: { id: string; name: string; members: unknown[] }[] } | null) =>
        setGroups(d?.groups ?? []),
      )
      .catch(() => {});
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canAssign = everyone || groupId !== "" || selected.size > 0;

  async function assign() {
    setSaving(true);
    try {
      const res = await fetch(`/api/forms/${formId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(groupId && !everyone
            ? { groupId }
            : { clientIds: everyone ? "all" : [...selected] }),
          dueDate: dueDate || null,
          recurrence: cadence === "none" ? null : { cadence },
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setDone(typeof d.assigned === "number" ? d.assigned : selected.size);
        onAssigned?.();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-white p-5 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg">Assign form</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">{formTitle}</p>

        {done !== null ? (
          <div className="py-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Check className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm text-ink">
              Assigned to {done} {done === 1 ? "client" : "clients"}.
            </p>
            <div className="mt-5">
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEveryone((v) => !v)}
              className={cn(
                "mt-4 flex w-full items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors",
                everyone ? "border-royal-400 bg-royal-50/60 text-royal-800" : "border-line text-ink hover:bg-paper",
              )}
            >
              <Users className="h-4 w-4" />
              Everyone (all active clients)
              {everyone && <Check className="ml-auto h-4 w-4 text-royal-600" />}
            </button>

            {!everyone && groups.length > 0 && (
              <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-muted">
                Or send to a whole group
                <select
                  value={groupId}
                  onChange={(e) => {
                    setGroupId(e.target.value);
                    if (e.target.value) setSelected(new Set());
                  }}
                  className={field}
                >
                  <option value="">Pick clients individually…</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.members.length} {g.members.length === 1 ? "member" : "members"})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {!everyone && !groupId && (
              <div className="mt-3 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-line p-1.5">
                {clients.length === 0 ? (
                  <p className="p-3 text-center text-sm text-muted">No clients yet.</p>
                ) : (
                  clients.map((c) => {
                    const on = selected.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggle(c.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          on ? "bg-royal-50/70 text-royal-800" : "text-ink hover:bg-paper",
                        )}
                      >
                        {c.name}
                        {on && <Check className="h-4 w-4 text-royal-600" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-muted">
                Due date (optional)
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted">
                Repeat
                <select
                  value={cadence}
                  onChange={(e) => setCadence(e.target.value as typeof cadence)}
                  className={field}
                >
                  <option value="none">One-off</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" onClick={assign} disabled={!canAssign || saving}>
                {saving ? "Assigning…" : "Assign"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
