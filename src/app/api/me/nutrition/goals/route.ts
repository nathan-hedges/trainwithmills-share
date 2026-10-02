import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { clampNum, clientCanEditGoals, ensureProfile, proteinGoal } from "@/lib/nutrition/server";
import { tierFromPlan } from "@/lib/nutrition/plan";

const GOAL_FIELDS = [
  "bodyWeightKg",
  "proteinMultiplier",
  "stepsGoal",
  "sleepGoal",
  "waterGoal",
  "fiveADayGoal",
];

// PATCH /api/me/nutrition/goals -the client edits their own goals. Allowed on
// student + beginner; performance is coach-set so it 403s.
export async function PATCH(req: Request) {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, plan: true },
  });
  if (!user) return new Response("Not found", { status: 404 });

  const tier = tierFromPlan(user.plan);
  if (!tier || !clientCanEditGoals(tier)) {
    return new Response("Your goals are set by your coach.", { status: 403 });
  }

  await ensureProfile(user.id);
  const body = await req.json();
  const data = Object.fromEntries(
    Object.entries(body)
      .filter(([k]) => GOAL_FIELDS.includes(k))
      .map(([k, v]) => [k, clampNum(k, v)]),
  );

  const profile = await prisma.nutritionProfile.update({ where: { userId: user.id }, data });
  return Response.json({
    ...profile,
    proteinGoal: proteinGoal(profile.bodyWeightKg, profile.proteinMultiplier),
  });
}
