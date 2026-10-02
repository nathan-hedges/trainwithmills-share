/**
 * Shared form-builder DTOs -the contract between the API (which you build from
 * docs/forms-backend-guide.md) and the Form* UI components under components/portal.
 */

export type QuestionType =
  | "short" // single-line text
  | "long" // paragraph
  | "single" // multiple choice, pick one
  | "multi" // checkboxes, pick many
  | "scale" // 1–5 rating
  | "number"
  | "yesno"
  | "date";

export interface FormQuestion {
  id: string; // stable id within the form (used to key answers)
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[]; // only for "single" / "multi"
}

/** Builder metadata -what each type is called and whether it needs options. */
export const QUESTION_TYPES: { type: QuestionType; label: string; hasOptions: boolean }[] = [
  { type: "short", label: "Short text", hasOptions: false },
  { type: "long", label: "Paragraph", hasOptions: false },
  { type: "single", label: "Multiple choice", hasOptions: true },
  { type: "multi", label: "Checkboxes", hasOptions: true },
  { type: "scale", label: "Scale (1–5)", hasOptions: false },
  { type: "number", label: "Number", hasOptions: false },
  { type: "yesno", label: "Yes / No", hasOptions: false },
  { type: "date", label: "Date", hasOptions: false },
];

export type AnswerValue = string | string[] | number | boolean | null;

export interface FormAnswer {
  questionId: string;
  value: AnswerValue;
}

// ── Coach-facing ─────────────────────────────────────────────────────
export interface FormSummary {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  assignedCount: number;
  completedCount: number;
  createdAt: string;
}

export interface FormDetail {
  id: string;
  title: string;
  description: string | null;
  questions: FormQuestion[];
}

export interface AssignmentResponse {
  assignmentId: string;
  clientId: string;
  clientName: string;
  status: "assigned" | "completed";
  completedAt: string | null;
  answers: FormAnswer[] | null;
}

export interface ClientOption {
  id: string;
  name: string;
}

// ── Client-facing ────────────────────────────────────────────────────
export interface AssignedForm {
  assignmentId: string;
  status: "assigned" | "completed";
  dueDate: string | null;
  form: FormDetail;
  answers: FormAnswer[] | null;
}
