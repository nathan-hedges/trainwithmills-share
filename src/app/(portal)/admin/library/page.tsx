"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { ExerciseDef } from "@/lib/portal/types";
import { Badge, Card, PageHeading } from "@/components/portal/primitives";
import { GuideImage } from "@/components/portal/GuideImage";
import { Button } from "@/components/ui/Button";
import { ExerciseModal } from "@/components/portal/ExerciseModal";
import { ConfirmDialog } from "@/components/portal/ConfirmDialog";

export default function LibraryPage() {
  const [library, setLibrary] = useState<ExerciseDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"new" | ExerciseDef | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ExerciseDef | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/exercises")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ExerciseDef[]) => {
        if (active) setLibrary(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  /** Insert a new exercise or replace the edited one, keeping the list sorted by name. */
  function upsert(saved: ExerciseDef) {
    setLibrary((prev) => {
      const without = prev.filter((e) => e.id !== saved.id);
      return [...without, saved].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  async function remove(ex: ExerciseDef) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/exercises/${ex.id}`, { method: "DELETE" });
      if (res.ok) setLibrary((prev) => prev.filter((e) => e.id !== ex.id));
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? library.filter(
          (ex) => ex.name.toLowerCase().includes(q) || ex.category.toLowerCase().includes(q),
        )
      : library;
  }, [library, query]);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Exercise library"
        subtitle="Your reusable exercises - edit, delete, or add new ones to use when building workouts."
      >
        <Button onClick={() => setModal("new")} size="sm">
          <Plus className="h-4 w-4" />
          New exercise
        </Button>
      </PageHeading>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or category"
          className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm text-ink placeholder:text-muted/60 focus:border-royal-400 focus:outline-none focus:ring-4 focus:ring-royal-500/10"
        />
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted">Loading your library…</Card>
      ) : library.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-royal-50 text-royal-600">
            <Plus className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl">No exercises yet</h2>
          <p className="max-w-sm text-muted">
            Add your first exercise to start building workouts from your own library.
          </p>
          <Button onClick={() => setModal("new")} className="mt-1">
            <Plus className="h-4 w-4" />
            New exercise
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted">No exercises match your search.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ex) => (
            <Card key={ex.id} className="overflow-hidden">
              <div className="relative aspect-[16/10] w-full">
                <GuideImage src={ex.guideImageUrl} name={ex.name} />
                <div className="absolute right-2 top-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setModal(ex)}
                    aria-label={`Edit ${ex.name}`}
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white/90 text-ink shadow-soft backdrop-blur transition-colors hover:bg-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(ex)}
                    aria-label={`Delete ${ex.name}`}
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white/90 text-red-500 shadow-soft backdrop-blur transition-colors hover:bg-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg">{ex.name}</h3>
                  <Badge tone="royal">{ex.category}</Badge>
                </div>
                {ex.cue && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{ex.cue}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {modal !== null && (
        <ExerciseModal
          exercise={modal === "new" ? undefined : modal}
          onSaved={upsert}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete exercise?"
          message={`"${confirmDelete.name}" will be removed from your library.`}
          confirmLabel={deleting ? "Deleting…" : "Delete"}
          onConfirm={() => remove(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
