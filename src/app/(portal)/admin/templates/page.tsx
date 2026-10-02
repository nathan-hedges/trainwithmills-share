"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Dumbbell, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, PageHeading } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/portal/ConfirmDialog";
import { cn } from "@/lib/utils";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  days: { dow: number; exercises: { id: string }[] }[];
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<TemplateRow | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  // Create an empty template (#7 POST), then jump straight into its editor.
  async function createTemplate() {
    setCreating(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New template" }),
      });
      if (res.ok) {
        const t = await res.json();
        router.push(`/admin/templates/${t.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  // Delete (#8 DELETE), then drop it from the list.
  async function remove(t: TemplateRow) {
    const res = await fetch(`/api/templates/${t.id}`, { method: "DELETE" });
    if (res.ok) setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    setConfirm(null);
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Program templates"
        subtitle="Build a week once, then apply it to any client in one click."
      >
        <Button onClick={createTemplate} size="sm" disabled={creating}>
          <Plus className="h-4 w-4" />
          {creating ? "Creating…" : "New template"}
        </Button>
      </PageHeading>

      {loading ? (
        <Card className="p-10 text-center text-muted">Loading templates…</Card>
      ) : templates.length === 0 ? (
        <Card className="p-10 text-center text-muted">
          No templates yet. Create one from scratch, or open a client&apos;s Programming week and choose
          &ldquo;Save week as template&rdquo;.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const exCount = t.days.reduce((n, d) => n + d.exercises.length, 0);
            const activeDows = new Set(t.days.map((d) => d.dow));
            return (
              <Card key={t.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg leading-tight">{t.name}</h3>
                  <div className="flex shrink-0 gap-1">
                    <Link
                      href={`/admin/templates/${t.id}`}
                      aria-label={`Edit ${t.name}`}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-royal-50 hover:text-ink"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setConfirm(t)}
                      aria-label={`Delete ${t.name}`}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {t.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{t.description}</p>}
                <div className="mt-3 flex gap-1">
                  {DOW.map((d, i) => (
                    <span
                      key={i}
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-lg text-[11px] font-semibold",
                        activeDows.has(i) ? "bg-royal-600 text-white" : "bg-paper text-muted",
                      )}
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t.days.length} {t.days.length === 1 ? "day" : "days"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Dumbbell className="h-3.5 w-3.5" />
                    {exCount} exercises
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete template?"
          message={`"${confirm.name}" will be removed. Clients already assigned this week keep their workouts.`}
          confirmLabel="Delete"
          onConfirm={() => remove(confirm)}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
