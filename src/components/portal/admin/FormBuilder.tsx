"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { QUESTION_TYPES, type FormDetail, type FormQuestion, type QuestionType } from "@/lib/forms/types";

const field =
  "h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink focus:border-royal-400 focus:bg-white focus:outline-none";

const newQuestion = (): FormQuestion => ({
  id: crypto.randomUUID(),
  type: "short",
  label: "",
  required: false,
});

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  return (
    <div className="mt-2 space-y-1.5 pl-6">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted">{i + 1}.</span>
          <input
            value={opt}
            onChange={(e) => onChange(options.map((o, j) => (j === i ? e.target.value : o)))}
            className={cn(field, "h-9 flex-1")}
          />
          <button
            type="button"
            onClick={() => onChange(options.filter((_, j) => j !== i))}
            aria-label="Remove option"
            className="text-muted hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...options, `Option ${options.length + 1}`])}
        className="text-xs font-medium text-royal-700 hover:text-royal-800"
      >
        + Add option
      </button>
    </div>
  );
}

function QuestionEditor({
  q,
  index,
  count,
  onChange,
  onType,
  onMove,
  onRemove,
}: {
  q: FormQuestion;
  index: number;
  count: number;
  onChange: (patch: Partial<FormQuestion>) => void;
  onType: (t: QuestionType) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const hasOptions = QUESTION_TYPES.find((t) => t.type === q.type)?.hasOptions;
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="text-xs font-semibold text-muted">Q{index + 1}</span>
        <input
          value={q.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Question text"
          className={cn(field, "flex-1")}
        />
        <select
          value={q.type}
          onChange={(e) => onType(e.target.value as QuestionType)}
          className={cn(field, "sm:w-44")}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {hasOptions && <OptionsEditor options={q.options ?? []} onChange={(options) => onChange({ options })} />}

      <div className="mt-2 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={q.required} onChange={(e) => onChange({ required: e.target.checked })} />
          Required
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
            className="grid h-7 w-7 place-items-center rounded text-muted hover:bg-paper disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === count - 1}
            aria-label="Move down"
            className="grid h-7 w-7 place-items-center rounded text-muted hover:bg-paper disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove question"
            className="grid h-7 w-7 place-items-center rounded text-muted hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function FormBuilder({
  initial,
  onSaved,
  onClose,
}: {
  initial: FormDetail | null;
  onSaved: (f: FormDetail) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [questions, setQuestions] = useState<FormQuestion[]>(initial?.questions ?? []);
  const [saving, setSaving] = useState(false);

  const update = (id: string, patch: Partial<FormQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  function move(i: number, dir: -1 | 1) {
    setQuestions((qs) => {
      const j = i + dir;
      if (j < 0 || j >= qs.length) return qs;
      const next = [...qs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function setType(id: string, type: QuestionType) {
    const hasOptions = QUESTION_TYPES.find((t) => t.type === type)?.hasOptions;
    const current = questions.find((q) => q.id === id);
    update(id, { type, options: hasOptions ? current?.options ?? ["Option 1"] : undefined });
  }

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      questions: questions.filter((q) => q.label.trim()),
    };
    try {
      const res = await fetch(initial ? `/api/forms/${initial.id}` : "/api/forms", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) onSaved(await res.json());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-6 h-fit w-full max-w-2xl rounded-2xl border border-line bg-white p-5 shadow-elevated sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg">{initial ? "Edit form" : "New form"}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Form title (e.g. Weekly check-in)"
            className={field}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            rows={2}
            className={cn(field, "h-auto resize-none py-2")}
          />
        </div>

        <div className="mt-5 space-y-3">
          {questions.map((q, i) => (
            <QuestionEditor
              key={q.id}
              q={q}
              index={i}
              count={questions.length}
              onChange={(patch) => update(q.id, patch)}
              onType={(t) => setType(q.id, t)}
              onMove={(dir) => move(i, dir)}
              onRemove={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
            />
          ))}
          {questions.length === 0 && (
            <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">
              No questions yet -add your first below.
            </p>
          )}
        </div>

        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={() => setQuestions((qs) => [...qs, newQuestion()])}>
            <Plus className="h-4 w-4" />
            Add question
          </Button>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={!title.trim() || saving}>
            {saving ? "Saving…" : "Save form"}
          </Button>
        </div>
      </div>
    </div>
  );
}
