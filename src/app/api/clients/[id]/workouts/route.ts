import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Build the 7 dates Mon..Sun for the week starting at `weekStart`.
// We do plain local date math + manual formatting so we never touch UTC
// (which is what causes "the date is off by one day" bugs).
function weekDates(weekStart: string): string[] {
  const [y, m, d] = weekStart.split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(y, m - 1, d + i);             // local date, i days later
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${dt.getFullYear()}-${mm}-${dd}`;         // back to "YYYY-MM-DD"
  });
}

// GET /api/clients/[id]/workouts?weekStart=YYYY-MM-DD
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 1) AUTH -only a signed-in coach may read any client's programming.
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  // 2) INPUT -client id comes from the URL path; weekStart from the query string.
  const { id: clientId } = await params;                  // params is a Promise in Next 16 -await it
  const weekStart = new URL(req.url).searchParams.get("weekStart");
  if (!weekStart) return new Response("Missing weekStart", { status: 400 });

  // 3) DB -every workout for this client in the 7-day window, with the
  //    nested exercises (each carrying its library info + its sets) and check-in.
  const workouts = await prisma.workout.findMany({
    where: { clientId, date: { in: weekDates(weekStart) } },
    orderBy: { date: "asc" },
    include: {
      checkIn: true,
      exercises: {
        orderBy: { order: "asc" },
        include: {
          exercise: true,                         // library name/category/cue/image
          sets: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  // 4) RESPONSE -hand the array straight back as JSON.
  return Response.json(workouts);
}