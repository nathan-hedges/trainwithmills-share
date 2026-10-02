"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Card, PageHeading } from "@/components/portal/primitives";
import { FormFill } from "@/components/portal/client/FormFill";
import type { AssignedForm } from "@/lib/forms/types";

function fmtDue(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function FormRow({ a, onOpen }: { a: AssignedForm; onOpen: () => void }) {
  const done = a.status === "completed";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-royal-50/40"
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
          done ? "bg-emerald-50 text-emerald-600" : "bg-royal-50 text-royal-600",
        )}
      >
        {done ? <CheckCircle2 className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink">{a.form.title}</span>
        <span className="flex items-center gap-2 text-xs text-muted">
          {a.form.questions.length} {a.form.questions.length === 1 ? "question" : "questions"}
          {a.dueDate && !done && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <CalendarClock className="h-3 w-3" /> due {fmtDue(a.dueDate)}
            </span>
          )}
        </span>
      </span>
      <Badge tone={done ? "green" : "amber"}>{done ? "Completed" : "To do"}</Badge>
    </button>
  );
}

export default function ClientFormsPage() {
  const [forms, setForms] = useState<AssignedForm[] | null>(null);
  const [active, setActive] = useState<AssignedForm | null>(null);

  const load = useCallback(() => {
    fetch("/api/me/forms")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: AssignedForm[]) => setForms(d))
      .catch(() => setForms([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const todo = forms?.filter((f) => f.status !== "completed") ?? [];
  const completed = forms?.filter((f) => f.status === "completed") ?? [];

  return (
    <div className="space-y-6">
      <PageHeading title="Forms" subtitle="Check-ins and questionnaires from me." />

      {forms === null ? (
        <Card className="p-8 text-center text-muted">Loading forms…</Card>
      ) : forms.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <ClipboardList className="h-7 w-7 text-royal-500" />
          <p className="text-muted">Nothing to fill in right now -you&apos;re all caught up.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {todo.length > 0 && (
            <div>
              <h2 className="mb-2 font-display text-lg">To do</h2>
              <Card className="divide-y divide-line overflow-hidden">
                {todo.map((a) => (
                  <FormRow key={a.assignmentId} a={a} onOpen={() => setActive(a)} />
                ))}
              </Card>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="mb-2 font-display text-lg">Completed</h2>
              <Card className="divide-y divide-line overflow-hidden">
                {completed.map((a) => (
                  <FormRow key={a.assignmentId} a={a} onOpen={() => setActive(a)} />
                ))}
              </Card>
            </div>
          )}
        </div>
      )}

      {active && (
        <FormFill
          assignment={active}
          onClose={() => setActive(null)}
          onSubmitted={() => {
            setActive(null);
            load();
          }}
        />
      )}
    </div>
  );
}
