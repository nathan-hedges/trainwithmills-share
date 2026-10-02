import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { readJson, selfWorkoutSchema } from "@/lib/validation";

// The 7 ISO dates Mon..Sun for the week starting at weekStart (local date math).
function weekDates(weekStart: string): string[] {
  const [y, m, d] = weekStart.split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(y, m - 1, d + i);
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${dt.getFullYear()}-${mm}-${dd}`;
  });
}

async function me() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return null;
  return prisma.user.findUnique({ where: { email }, select: { id: true, firstName: true } });
}

// GET /api/me/self-workouts?weekStart=YYYY-MM-DD — my own-logged sessions for a week.
export async function GET(req: Request) {
  const user = await me();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const weekStart = new URL(req.url).searchParams.get("weekStart");
  const rows = await prisma.selfWorkout.findMany({
    where: { clientId: user.id, ...(weekStart ? { date: { in: weekDates(weekStart) } } : {}) },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return Response.json(rows);
}

// POST /api/me/self-workouts — log a session I did outside my programming.
// The coach gets an in-portal notification so she knows.
export async function POST(req: Request) {
  const user = await me();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const parsed = await readJson(req, selfWorkoutSchema);
  if (parsed.error) return parsed.error;
  const { date, description } = parsed.data;

  const created = await prisma.selfWorkout.create({
    data: { clientId: user.id, date, description },
  });

  const coach = await prisma.user.findFirst({ where: { role: "COACH" }, select: { id: true } });
  if (coach && coach.id !== user.id) {
    await createNotification(
      coach.id,
      "milestone",
      `${user.firstName ?? "A client"} logged their own session`,
      `/admin/clients/${user.id}`,
    );
  }

  return Response.json(created);
}
