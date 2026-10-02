"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { ExerciseCategory, ExerciseDef } from "@/lib/portal/types";
import { Button } from "@/components/ui/Button";
import { GuideImage } from "./GuideImage";

const categories: ExerciseCategory[] = ["Lower", "Upper", "Cardio", "Core", "Conditioning"];

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-paper px-3.5 text-sm text-ink transition-colors placeholder:text-muted/60 focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-royal-500/10";
const labelCls = "mb-1.5 block text-sm font-medium text-ink";

/** Create a new exercise, or edit one when `exercise` is provided. */
export function ExerciseModal({
  exercise,
  onClose,
  onSaved,
}: {
  exercise?: ExerciseDef;
  onClose: () => void;
  /** Called with the saved exercise so the library can refresh its list. */
  onSaved?: (saved: ExerciseDef) => void;
}) {
  const editing = !!exercise;
  const [name, setName] = useState(exercise?.name ?? "");
  const [category, setCategory] = useState<ExerciseCategory>(exercise?.category ?? "Lower");
  const [description, setDescription] = useState(exercise?.cue ?? "");
  const [image, setImage] = useState(exercise?.guideImageUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    const input = {
      name: name.trim(),
      category,
      cue: description.trim() || null,
      guideImageUrl: image.trim() || null,
    };
    try {
      const res = await fetch(
        editing && exercise ? `/api/exercises/${exercise.id}` : "/api/exercises",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!res.ok) throw new Error(await res.text());
      const saved = (await res.json()) as ExerciseDef;
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-white p-6 shadow-elevated"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">{editing ? "Edit exercise" : "New exercise"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <label htmlFor="ex-video" className={labelCls}>
            Guide video <span className="font-normal text-muted">(YouTube link)</span>
          </label>
          <input
            id="ex-video"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            aria-label="YouTube guide URL"
            className={inputCls}
          />
          {/* Live preview - the thumbnail appears once the link is a valid YouTube URL. */}
          <div className="mt-2 aspect-video w-full overflow-hidden rounded-2xl border border-line">
            <GuideImage src={image || undefined} name={name || "exercise"} />
          </div>
          <p className="mt-1 text-xs text-muted">Paste any YouTube link - clients tap the thumbnail to watch.</p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ex-name" className={labelCls}>
              Name
            </label>
            <input
              id="ex-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Bulgarian Split Squat"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="ex-cat" className={labelCls}>
              Category
            </label>
            <select
              id="ex-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
              className={inputCls}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="ex-desc" className={labelCls}>
            Description / coaching cue
          </label>
          <textarea
            id="ex-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="How to perform it - shown to the client on their exercise card."
            className={`${inputCls} h-auto resize-none py-2.5`}
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create exercise"}
          </Button>
        </div>
      </form>
    </div>
  );
}
