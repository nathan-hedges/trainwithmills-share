import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { clampNum, ensureProfile, proteinGoal } from "@/lib/nutrition/server";
import { tierFromPlan } from "@/lib/nutrition/plan";

const GOAL_FIELDS = [
  "bodyWeightKg",
  "proteinMultiplier",
  "stepsGoal",
  "sleepGoal",
  "waterGoal",
  "fiveADayGoal",
];

// PATCH /api/clients/[id]/nutrition/goals -coach sets a client's goals.
// Tier is derived from the client's plan, so it is NOT set here.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { plan: true } });
  if (!user) return new Response("Not found", { status: 404 });

  await ensureProfile(id);
  const body = await req.json();
  const data = Object.fromEntries(
    Object.entries(body)
      .filter(([k]) => GOAL_FIELDS.includes(k))
      .map(([k, v]) => [k, clampNum(k, v)]),
  );

  const profile = Object.keys(data).length
    ? await prisma.nutritionProfile.update({ where: { userId: id }, data })
    : await ensureProfile(id);

  return Response.json({
    tier: tierFromPlan(user.plan),
    profile: {
      ...profile,
      proteinGoal: proteinGoal(profile.bodyWeightKg, profile.proteinMultiplier),
    },
  });
}
