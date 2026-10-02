import type { AnswerValue, FormQuestion } from "./types";

/** Render a stored answer value as readable text. */
export function formatAnswer(q: FormQuestion, value: AnswerValue): string {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) return " -";
  if (q.type === "yesno") return value ? "Yes" : "No";
  if (q.type === "multi" && Array.isArray(value)) return value.join(", ");
  if (q.type === "scale") return `${value} / 5`;
  return String(value);
}
