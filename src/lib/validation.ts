/**
 * Zod schemas - the single source of truth for the shapes that arrive from
 * untrusted input: the public (unauthenticated) endpoints and the coach's
 * JSON→DB writes. Routes parse the body through these before touching Prisma.
 */
import { z } from "zod";

// ── A prescribed set row (strength: reps + RPE, or cardio: work/rest + pace) ──
export const setInputSchema = z.object({
  targetReps: z.union([z.number(), z.string()]).nullish(),
  targetRpe: z.string().nullish(),
  workSeconds: z.number().nullish(),
  restSeconds: z.number().nullish(),
  pace: z.string().nullish(),
});
export type SetInputDTO = z.infer<typeof setInputSchema>;

export const setsBodySchema = z.object({
  sets: z.array(setInputSchema).min(1, "At least one set is required"),
});

// ── Template save (nested days → exercises → sets) ──
export const templateSaveSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().nullish(),
  days: z
    .array(
      z.object({
        dow: z.number().int().min(0).max(6),
        title: z.string().nullish(),
        focus: z.string().nullish(),
        warmup: z.string().nullish(),
        exercises: z
          .array(
            z.object({
              exerciseId: z.string().min(1),
              order: z.number().int().optional(),
              note: z.string().nullish(),
              groupKey: z.string().nullish(),
              groupType: z.string().nullish(),
              sets: z.array(setInputSchema).optional(),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
});

// ── Strong Girl Project groups ──
export const groupSaveSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
  callSchedule: z.string().trim().max(120).nullish(), // e.g. "Wednesdays 7pm"
  callLink: z.string().trim().max(500).nullish(),
});

export const groupMemberSchema = z.object({
  clientId: z.string().min(1),
});

export const groupMessageSchema = z.object({
  text: z.string().trim().min(1, "Say something first").max(2000),
});

export const groupLessonSchema = z.object({
  title: z.string().trim().min(1, "A title is required").max(150),
  notes: z.string().trim().min(1, "Write the lesson notes").max(5000),
  link: z.string().trim().max(500).nullish(),
});

export const groupApplyTemplateSchema = z.object({
  templateId: z.string().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart must be YYYY-MM-DD"),
});

// -- Invites (what the onboarding call captures) --
export const inviteCreateSchema = z.object({
  email: z.email("A valid email is required"),
  firstName: z.string().trim().max(80).nullish(),
  lastName: z.string().trim().max(80).nullish(),
  plan: z.string().trim().min(1, "Pick a plan"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD")
    .nullish(),
  lifestyle: z.string().trim().max(1000).nullish(),
  injuries: z.string().trim().max(1000).nullish(),
  goal: z.string().trim().max(500).nullish(),
  cycleTracking: z.boolean().optional(),
  contraception: z.string().trim().max(40).nullish(),
  avgCycleLength: z.number().int().min(15).max(60).nullish(),
  avgPeriodLength: z.number().int().min(1).max(14).nullish(),
});

// -- Cycle tracking --
export const cycleLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  flow: z.enum(["light", "medium", "heavy"]).nullish(),
  symptoms: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  mood: z.number().int().min(1).max(5).nullish(),
  sleepQuality: z.number().int().min(1).max(5).nullish(),
  note: z.string().trim().max(500).nullish(),
});

export const cycleConsentSchema = z.object({
  lastPeriodStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "lastPeriodStart must be YYYY-MM-DD")
    .nullish(),
});

export const cycleProfileSchema = z.object({
  contraception: z.string().trim().min(1),
  avgCycleLength: z.number().int().min(15).max(60),
  avgPeriodLength: z.number().int().min(1).max(14),
});

export const cycleSettingsSchema = z.object({
  shareLevel: z.enum(["private", "minimal", "full"]),
});

export const cycleGuidanceSchema = z.object({
  phase: z.enum(["menstrual", "follicular", "ovulation", "luteal"]),
  training: z.string().trim().max(2000),
});

export const exerciseCreateSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  cue: z.string().nullish(),
  guideImageUrl: z.string().nullish(),
});

export const addExerciseSchema = z.object({
  exerciseId: z.string().min(1),
});

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

/** Move/swap a workout to another date (same client, handled server-side). */
export const moveWorkoutSchema = z.object({ date: isoDate });

/** A client logging their own (non-programmed) session. */
export const selfWorkoutSchema = z.object({
  date: isoDate,
  description: z.string().trim().min(1, "Describe what you did").max(2000),
});

// ── Public / auth-flow endpoints ──
export const passwordRequestSchema = z.object({ email: z.email() });

export const passwordResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email("A valid email is required"),
  message: z.string().optional(),
  goal: z.string().optional(),
});

export const uploadUrlSchema = z.object({
  contentType: z.string().min(1),
  ext: z.string().min(1),
  size: z.number().int().positive().optional(),
});

/** Parse a JSON request body against a schema → typed data, or a 400 Response. */
export async function readJson<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ data: z.infer<S>; error?: undefined } | { data?: undefined; error: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: new Response("Invalid JSON body", { status: 400 }) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { error: new Response(parsed.error.issues[0]?.message ?? "Invalid request", { status: 400 }) };
  }
  return { data: parsed.data as z.infer<S> };
}
