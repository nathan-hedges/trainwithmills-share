import type { Prisma } from "@prisma/client";
import type { FormQuestion } from "@/lib/forms/types";

// Returns Prisma.InputJsonValue (not FormQuestion[]) so it drops straight into a
// `questions:` write - Prisma's Json input type won't accept a typed interface
// array, so we cast once here and keep the route call-sites clean.
export function cleanQuestions(raw: unknown): Prisma.InputJsonValue {
  if (!Array.isArray(raw)) return [];
  const TYPES = ["short", "long", "single", "multi", "scale", "number", "yesno", "date"];
  const cleaned: FormQuestion[] = raw
    .filter((q): q is Record<string, unknown> => !!q && typeof q === "object")
    .map((q) => ({
      id: String(q.id ?? crypto.randomUUID()),
      type: TYPES.includes(String(q.type)) ? (String(q.type) as FormQuestion["type"]) : "short",
      label: String(q.label ?? "").trim(),
      required: Boolean(q.required),
      options: Array.isArray(q.options) ? q.options.map(String).filter(Boolean) : undefined,
    }))
    .filter((q) => q.label);
  return cleaned as unknown as Prisma.InputJsonValue;
}

export function toDetail(f: { id: string; title: string; description: string | null; questions: unknown }) {
  return {
    id: f.id,
    title: f.title,
    description: f.description,
    questions: (Array.isArray(f.questions) ? f.questions : []) as FormQuestion[],
  };
}