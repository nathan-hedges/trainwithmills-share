import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tiers } from "@/lib/content";
import { PROGRAMME_DAYS, programmeLastDay } from "@/lib/billing";
import { readJson, groupSaveSchema } from "@/lib/validation";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

const memberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  programmePaidAt: true,
  status: true,
} as const;

const isoDay = (d: Date) => d.toISOString().split("T")[0];

/** This week's Monday, in the local convention Workout.date uses. */
function mondayISO(): string {
  const now = new Date();
  const m = new Date(now);
  m.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(m.getDate()).padStart(2, "0")}`;
}

/**
 * GET /api/groups - every group with its members, plus the Strong Girl clients
 * who aren't in a group yet (Millie's "to place" list).
 *
 * Each group carries what she actually needs at a glance: where it is in its
 * six weeks, how each member is training, and whether the chat is alive.
 */
export async function GET() {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

  const oneOffPlan = tiers.find((t) => t.billing === "one-off")?.name ?? "";
  const [groups, unassigned] = await Promise.all([
    prisma.group.findMany({
      orderBy: { startDate: "desc" },
      include: {
        members: { select: memberSelect, orderBy: { firstName: "asc" } },
        lessons: { orderBy: { createdAt: "desc" } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "CLIENT", plan: oneOffPlan, groupId: null },
      select: memberSelect,
      orderBy: { firstName: "asc" },
    }),
  ]);

  const memberIds = groups.flatMap((g) => g.members.map((m) => m.id));
  const today = isoDay(new Date());
  const monday = mondayISO();

  // One query for every member's sessions, then split per group in memory.
  const workouts = memberIds.length
    ? await prisma.workout.findMany({
        where: { clientId: { in: memberIds } },
        select: { clientId: true, date: true, status: true },
      })
    : [];

  // Most recent chat message per group, so she can spot a quiet cohort.
  const lastMessages = await prisma.groupMessage.findMany({
    where: { groupId: { in: groups.map((g) => g.id) } },
    orderBy: { createdAt: "desc" },
    distinct: ["groupId"],
    select: { groupId: true, createdAt: true },
  });
  const lastMessageAt = new Map(lastMessages.map((m) => [m.groupId, m.createdAt]));

  const shaped = groups.map((g) => {
    const startISO = isoDay(g.startDate);
    const endISO = isoDay(programmeLastDay(g.startDate));

    const status: "upcoming" | "running" | "finished" =
      today < startISO ? "upcoming" : today > endISO ? "finished" : "running";
    const dayNumber = Math.floor(
      (new Date(`${today}T00:00:00Z`).getTime() - new Date(`${startISO}T00:00:00Z`).getTime()) / 86_400_000,
    ) + 1;
    const week = status === "upcoming" ? 0 : Math.min(Math.ceil(dayNumber / 7), PROGRAMME_DAYS / 7);

    const members = g.members.map((m) => {
      const mine = workouts.filter((w) => w.clientId === m.id);
      const inProgramme = mine.filter((w) => w.date >= startISO && w.date <= endISO);
      return {
        ...m,
        sessionsDone: inProgramme.filter((w) => w.status === "completed").length,
        sessionsPlanned: inProgramme.length,
        thisWeekDone: inProgramme.filter((w) => w.status === "completed" && w.date >= monday).length,
        thisWeekPlanned: inProgramme.filter((w) => w.date >= monday).length,
      };
    });

    return {
      id: g.id,
      name: g.name,
      startDate: g.startDate,
      callSchedule: g.callSchedule,
      callLink: g.callLink,
      lessons: g.lessons,
      members,
      status,
      week,
      endDate: endISO,
      messageCount: g._count.messages,
      lastMessageAt: lastMessageAt.get(g.id) ?? null,
    };
  });

  return Response.json({ groups: shaped, unassigned, cap: 12 });
}

// POST /api/groups - create a group (name + programme start date).
export async function POST(req: Request) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

  const parsed = await readJson(req, groupSaveSchema);
  if (parsed.error) return parsed.error;
  const { name, startDate, callSchedule, callLink } = parsed.data;

  const group = await prisma.group.create({
    // Midnight UTC, matching the portal's UTC day convention.
    data: {
      name,
      startDate: new Date(`${startDate}T00:00:00Z`),
      callSchedule: callSchedule || null,
      callLink: callLink || null,
    },
  });
  return Response.json(group);
}
