import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

// GET /api/clients/[id]/self-workouts[?weekStart=] — coach reads a client's
// own-logged sessions (one week, or the most recent ones).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id: clientId } = await params;
  const weekStart = new URL(req.url).searchParams.get("weekStart");

  const rows = await prisma.selfWorkout.findMany({
    where: { clientId, ...(weekStart ? { date: { in: weekDates(weekStart) } } : {}) },
    orderBy: { date: "desc" },
    take: 50,
  });
  return Response.json(rows);
}
