"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/portal/primitives";
import { formatAnswer } from "@/lib/forms/format";
import type { AssignmentResponse, FormDetail } from "@/lib/forms/types";

function ResponseRow({ r, form }: { r: AssignmentResponse; form: FormDetail }) {
  const [open, setOpen] = useState(false);
  const done = r.status === "completed";

  return (
    <div className="rounded-xl border border-line">
      <button
        type="button"
        onClick={() => done && setOpen((v) => !v)}
        className={cn("flex w-full items-center gap-2 p-3 text-left", done && "hover:bg-paper")}
      >
        <span className="flex-1 text-sm font-medium text-ink">{r.clientName}</span>
        <Badge tone={done ? "green" : "neutral"}>{done ? "Completed" : "Not started"}</Badge>
        {done && <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} />}
      </button>
      {open && done && (
        <div className="space-y-2.5 border-t border-line p-3">
          {form.questions.map((q) => {
            const a = r.answers?.find((x) => x.questionId === q.id);
            return (
              <div key={q.id}>
                <div className="text-xs text-muted">{q.label}</div>
                <div className="text-sm text-ink">{a ? formatAnswer(q, a.value) : " -"}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FormResponsesModal({
  formId,
  formTitle,
  onClose,
}: {
  formId: string;
  formTitle: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormDetail | null>(null);
  const [responses, setResponses] = useState<AssignmentResponse[] | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/forms/${formId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/forms/${formId}/responses`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([f, rs]) => {
        if (!active) return;
        setForm(f);
        setResponses(rs);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [formId]);

  const completed = responses?.filter((r) => r.status === "completed").length ?? 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-white p-5 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg">Responses</h3>
            <p className="text-xs text-muted">
              {formTitle}
              {responses ? ` · ${completed}/${responses.length} completed` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {!responses || !form ? (
            <p className="py-8 text-center text-sm text-muted">Loading…</p>
          ) : responses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Not assigned to anyone yet.</p>
          ) : (
            responses.map((r) => <ResponseRow key={r.assignmentId} r={r} form={form} />)
          )}
        </div>
      </div>
    </div>
  );
}
