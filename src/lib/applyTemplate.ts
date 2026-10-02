import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

// The 7 ISO dates Mon..Sun for the week starting at weekStart (local date math,
// so no UTC off-by-one).
export function weekDates(weekStart: string): string[] {
  const [y, m, d] = weekStart.split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(y, m - 1, d + i);
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${dt.getFullYear()}-${mm}-${dd}`;
  });
}

/** A template loaded with days -> exercises -> ordered sets (what apply needs). */
export function loadTemplateForApply(templateId: string) {
  return prisma.template.findUnique({
    where: { id: templateId },
    include: { days: { include: { exercises: { include: { sets: { orderBy: { order: "asc" } } } } } } },
  });
}

type LoadedTemplate = NonNullable<Awaited<ReturnType<typeof loadTemplateForApply>>>;

/**
 * Stamp a loaded template onto one client's week. REPLACES that week's existing
 * sessions, in one transaction so the week is never left half-replaced.
 * Shared by the single-client apply route and the whole-group apply.
 */
export async function applyTemplateToClient(template: LoadedTemplate, clientId: string, weekStart: string) {
  const dates = weekDates(weekStart);

  await prisma.$transaction(async (tx) => {
    // 1) Clear the client's existing sessions on those 7 dates. Cascade deletes
    //    their exercises / sets / check-ins automatically.
    await tx.workout.deleteMany({ where: { clientId, date: { in: dates } } });

    // 2) Recreate one session per template day, nesting its exercises + sets.
    for (const day of template.days) {
      // Each relative groupKey becomes a fresh real groupId for this session, so
      // the template's supersets/circuits carry through to the client's week.
      const groupIds = new Map<string, string>();
      for (const te of day.exercises) {
        if (te.groupKey && !groupIds.has(te.groupKey)) groupIds.set(te.groupKey, randomUUID());
      }

      await tx.workout.create({
        data: {
          clientId,
          date: dates[day.dow], // dow 0=Mon..6=Sun -> the matching week date
          title: day.title,
          focus: day.focus,
          status: "assigned",
          warmup: day.warmup,
          exercises: {
            create: day.exercises.map((te) => ({
              exerciseId: te.exerciseId,
              order: te.order,
              prescription: te.prescription,
              note: te.note,
              groupId: te.groupKey ? groupIds.get(te.groupKey) : null,
              groupType: te.groupType,
              sets: {
                create: (te.sets.length
                  ? te.sets
                  : [{ targetReps: 10, targetRpe: null, workSeconds: null, restSeconds: null, pace: null }]
                ).map((s, i) => ({
                  order: i + 1,
                  targetReps: s.targetReps,
                  targetRpe: s.targetRpe,
                  workSeconds: s.workSeconds,
                  restSeconds: s.restSeconds,
                  pace: s.pace,
                })),
              },
            })),
          },
        },
      });
    }
  });
}
