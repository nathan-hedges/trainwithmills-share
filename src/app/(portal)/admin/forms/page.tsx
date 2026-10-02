"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Pencil, Plus, Send, Trash2, Users } from "lucide-react";
import { Badge, Card, PageHeading } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import { FormBuilder } from "@/components/portal/admin/FormBuilder";
import { AssignFormModal } from "@/components/portal/admin/AssignFormModal";
import { FormResponsesModal } from "@/components/portal/admin/FormResponsesModal";
import type { FormDetail, FormSummary } from "@/lib/forms/types";

export default function FormsPage() {
  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [builder, setBuilder] = useState<{ open: boolean; initial: FormDetail | null } | null>(null);
  const [assignFor, setAssignFor] = useState<FormSummary | null>(null);
  const [responsesFor, setResponsesFor] = useState<FormSummary | null>(null);

  const load = useCallback(() => {
    fetch("/api/forms")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: FormSummary[]) => setForms(d))
      .catch(() => setForms([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function edit(id: string) {
    const res = await fetch(`/api/forms/${id}`);
    if (res.ok) setBuilder({ open: true, initial: await res.json() });
  }

  async function remove(id: string) {
    await fetch(`/api/forms/${id}`, { method: "DELETE" }).catch(() => {});
    setForms((p) => (p ? p.filter((f) => f.id !== id) : p));
  }

  return (
    <div className="space-y-6">
      <PageHeading title="Forms" subtitle="Build questionnaires and check-ins, then assign them to clients.">
        <Button size="sm" onClick={() => setBuilder({ open: true, initial: null })}>
          <Plus className="h-4 w-4" />
          New form
        </Button>
      </PageHeading>

      {forms === null ? (
        <Card className="p-8 text-center text-muted">Loading forms…</Card>
      ) : forms.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <ClipboardList className="h-7 w-7 text-royal-500" />
          <p className="max-w-sm text-muted">No forms yet. Build your first questionnaire or check-in form.</p>
          <Button size="sm" onClick={() => setBuilder({ open: true, initial: null })}>
            <Plus className="h-4 w-4" />
            New form
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {forms.map((f) => (
            <Card key={f.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg leading-tight">{f.title}</h3>
                <Badge tone="royal">
                  {f.questionCount} {f.questionCount === 1 ? "question" : "questions"}
                </Badge>
              </div>
              {f.description && <p className="mt-1 text-sm text-muted">{f.description}</p>}

              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                <Users className="h-3.5 w-3.5" />
                {f.assignedCount} assigned · {f.completedCount} completed
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                <Button size="sm" onClick={() => setAssignFor(f)}>
                  <Send className="h-4 w-4" />
                  Assign
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setResponsesFor(f)}>
                  Responses
                </Button>
                <Button size="sm" variant="ghost" onClick={() => edit(f.id)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  aria-label={`Delete ${f.title}`}
                  className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {builder?.open && (
        <FormBuilder
          initial={builder.initial}
          onSaved={() => {
            setBuilder(null);
            load();
          }}
          onClose={() => setBuilder(null)}
        />
      )}
      {assignFor && (
        <AssignFormModal
          formId={assignFor.id}
          formTitle={assignFor.title}
          onAssigned={load}
          onClose={() => setAssignFor(null)}
        />
      )}
      {responsesFor && (
        <FormResponsesModal
          formId={responsesFor.id}
          formTitle={responsesFor.title}
          onClose={() => setResponsesFor(null)}
        />
      )}
    </div>
  );
}
