import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Build the 7 dates Mon..Sun for the week starting at `weekStart` (local date math).
function weekDates(weekStart: string): string[] {
  const [y, m, d] = weekStart.split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(y, m - 1, d + i);
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${dt.getFullYear()}-${mm}-${dd}`;
  });
}

// GET /api/me/workouts?weekStart=YYYY-MM-DD -the signed-in client's OWN week.
export async function GET(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return new Response("User not found", { status: 404 });

  const weekStart = new URL(req.url).searchParams.get("weekStart");
  if (!weekStart) return new Response("Missing weekStart", { status: 400 });

  const workouts = await prisma.workout.findMany({
    where: { clientId: me.id, date: { in: weekDates(weekStart) } },
    orderBy: { date: "asc" },
    include: {
      checkIn: true,
      exercises: {
        orderBy: { order: "asc" },
        include: {
          exercise: true,
          sets: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  return Response.json(workouts);
}
