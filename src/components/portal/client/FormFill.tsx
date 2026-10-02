"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { formatAnswer } from "@/lib/forms/format";
import type { AnswerValue, AssignedForm, FormAnswer, FormQuestion } from "@/lib/forms/types";

const field =
  "h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink focus:border-royal-400 focus:bg-white focus:outline-none";

const isAnswered = (v: AnswerValue) =>
  !(v == null || v === "" || (Array.isArray(v) && v.length === 0));

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: FormQuestion;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  switch (q.type) {
    case "long":
      return (
        <textarea
          rows={3}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={cn(field, "h-auto py-2")}
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={value == null ? "" : (value as number)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className={field}
        />
      );
    case "date":
      return <input type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className={field} />;
    case "scale":
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "h-10 w-10 rounded-lg border text-sm font-semibold transition-colors",
                value === n ? "border-royal-600 bg-royal-600 text-white" : "border-line bg-paper text-ink hover:border-royal-300",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      );
    case "yesno":
      return (
        <div className="flex gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => onChange(v)}
              className={cn(
                "h-10 flex-1 rounded-lg border text-sm font-medium transition-colors",
                value === v ? "border-royal-600 bg-royal-600 text-white" : "border-line bg-paper text-ink hover:border-royal-300",
              )}
            >
              {v ? "Yes" : "No"}
            </button>
          ))}
        </div>
      );
    case "single":
      return (
        <div className="space-y-1.5">
          {(q.options ?? []).map((opt) => (
            <label
              key={opt}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors",
                value === opt ? "border-royal-400 bg-royal-50/50" : "border-line hover:bg-paper",
              )}
            >
              <input type="radio" checked={value === opt} onChange={() => onChange(opt)} />
              {opt}
            </label>
          ))}
        </div>
      );
    case "multi": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          {(q.options ?? []).map((opt) => {
            const on = arr.includes(opt);
            return (
              <label
                key={opt}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors",
                  on ? "border-royal-400 bg-royal-50/50" : "border-line hover:bg-paper",
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onChange(on ? arr.filter((o) => o !== opt) : [...arr, opt])}
                />
                {opt}
              </label>
            );
          })}
        </div>
      );
    }
    default:
      return <input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className={field} />;
  }
}

export function FormFill({
  assignment,
  onClose,
  onSubmitted,
}: {
  assignment: AssignedForm;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { form } = assignment;
  const readOnly = assignment.status === "completed";

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(() => {
    const seed: Record<string, AnswerValue> = {};
    for (const a of assignment.answers ?? []) seed[a.questionId] = a.value;
    return seed;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const missing = form.questions.find((q) => q.required && !isAnswered(answers[q.id] ?? null));
    if (missing) {
      setError(`Please answer: ${missing.label}`);
      return;
    }
    setError("");
    setSaving(true);
    const payload: FormAnswer[] = form.questions.map((q) => ({
      questionId: q.id,
      value: answers[q.id] ?? null,
    }));
    try {
      const res = await fetch(`/api/me/forms/${assignment.assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      if (res.ok) onSubmitted();
      else setError("Couldn't submit -please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="my-6 h-fit w-full max-w-lg rounded-2xl border border-line bg-white p-5 shadow-elevated sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg">{form.title}</h3>
            {form.description && <p className="mt-0.5 text-sm text-muted">{form.description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {form.questions.map((q) => (
            <div key={q.id}>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                {q.label}
                {q.required && <span className="text-red-500"> *</span>}
              </label>
              {readOnly ? (
                <p className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink">
                  {formatAnswer(q, answers[q.id] ?? null)}
                </p>
              ) : (
                <QuestionInput
                  q={q}
                  value={answers[q.id] ?? null}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                />
              )}
            </div>
          ))}
        </div>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={submit} disabled={saving}>
              {saving ? "Submitting…" : "Submit"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
