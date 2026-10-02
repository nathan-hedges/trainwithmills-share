import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function weekDates(weekStart: string): string[] {
  const [y, m, d] = weekStart.split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(y, m - 1, d + i);
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${dt.getFullYear()}-${mm}-${dd}`;
  });
}

// POST /api/templates/from-week -save a client's existing week as a reusable template.
// Body: { clientId, weekStart, name, description? }
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if ((session?.user as { role?: string })?.role !== "COACH" || !email) {
    return new Response("Forbidden", { status: 403 });
  }

  const { clientId, weekStart, name, description } = await req.json();
  if (!clientId || !weekStart || !name?.trim()) {
    return new Response("clientId, weekStart and name are required", { status: 400 });
  }

  const dates = weekDates(weekStart);

  // Read the client's sessions for that week, with their exercises + sets.
  const workouts = await prisma.workout.findMany({
    where: { clientId, date: { in: dates } },
    include: { exercises: { include: { sets: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } } },
  });

  // Turn each non-empty session into a TemplateDay. `dow` = its position in the
  // week (0=Mon..6=Sun). Per exercise we capture each set's prescribed reps + RPE
  // (a template stores the prescription, not the per-session logged weights).
  const days = workouts
    .filter((w) => w.exercises.length > 0)
    .map((w) => ({
      dow: dates.indexOf(w.date),
      title: w.title,
      focus: w.focus,
      warmup: w.warmup,
      exercises: {
        create: w.exercises.map((we) => ({
          exerciseId: we.exerciseId,
          order: we.order,
          prescription: we.prescription,
          note: we.note,
          // the workout's groupId is already a stable per-day key -reuse it.
          groupKey: we.groupId,
          groupType: we.groupType,
          sets: {
            create: we.sets.map((s, i) => ({
              order: i,
              targetReps: s.targetReps,
              targetRpe: s.targetRpe,
              workSeconds: s.workSeconds,
              restSeconds: s.restSeconds,
              pace: s.pace,
            })),
          },
        })),
      },
    }));

  if (days.length === 0) {
    return new Response("That week has no sessions to save", { status: 400 });
  }

  const coach = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  // One nested create builds the whole Template -> days -> exercises tree.
  const template = await prisma.template.create({
    data: {
      coachId: coach?.id ?? null,
      name: name.trim(),
      description: description?.trim() || null,
      days: { create: days },
    },
    include: { days: { include: { exercises: true } } },
  });

  return Response.json(template);
}
