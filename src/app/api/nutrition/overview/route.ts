import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeOverview, deriveGoals, lastNDates } from "@/lib/nutrition/analytics";
import { tierFromPlan } from "@/lib/nutrition/plan";

const DEFAULT_PROFILE = {
  bodyWeightKg: null as number | null,
  proteinMultiplier: 1.6,
  stepsGoal: 10000,
  sleepGoal: 8,
  waterGoal: 2.5,
  fiveADayGoal: 5,
};

// GET /api/nutrition/overview -coach dashboard: every client's weekly
// protein + habit compliance, computed from their real logs.
export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  const all = await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      name: true,
      plan: true,
      nutritionProfile: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Only clients on a nutrition plan appear in the dashboard.
  const clients = all.flatMap((c) => {
    const tier = tierFromPlan(c.plan);
    return tier ? [{ ...c, tier }] : [];
  });

  const dates = [...lastNDates(7, 0), ...lastNDates(7, 7)];
  const logs = await prisma.nutritionLog.findMany({
    where: { userId: { in: clients.map((c) => c.id) }, date: { in: dates } },
  });

  const byUser = new Map<string, typeof logs>();
  for (const l of logs) {
    const arr = byUser.get(l.userId);
    if (arr) arr.push(l);
    else byUser.set(l.userId, [l]);
  }

  const rows = clients.map((c) => {
    const goals = deriveGoals(c.nutritionProfile ?? DEFAULT_PROFILE);
    const o = computeOverview(byUser.get(c.id) ?? [], goals);
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.name || "Client";
    const initials =
      (name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2) || "C").toUpperCase();
    return {
      id: c.id,
      name,
      initials,
      tier: c.tier,
      proteinGoal: goals.protein || null,
      ...o,
    };
  });

  return Response.json(rows);
}
