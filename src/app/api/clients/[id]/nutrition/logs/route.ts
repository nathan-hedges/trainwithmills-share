import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureProfile } from "@/lib/nutrition/server";
import { deriveGoals, lastNDates } from "@/lib/nutrition/analytics";

// GET /api/clients/[id]/nutrition/logs -coach view of what a client has
// actually logged recently (nutrition + habits), with their goals to compare.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;

  const profile = await ensureProfile(id);
  const dates = lastNDates(21);
  const rows = await prisma.nutritionLog.findMany({
    where: { userId: id, date: { in: dates } },
    orderBy: { date: "desc" },
  });

  // Only days where they actually logged something.
  const logs = rows.filter(
    (l) => l.protein > 0 || l.steps > 0 || l.sleep > 0 || l.water > 0 || l.fiveADay > 0,
  );

  return Response.json({ goals: deriveGoals(profile), logs });
}
