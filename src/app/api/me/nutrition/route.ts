import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureProfile, proteinGoal, resolveLogDate } from "@/lib/nutrition/server";
import { tierFromPlan } from "@/lib/nutrition/plan";

// GET /api/me/nutrition[?date=YYYY-MM-DD] -the signed-in client's tier (from
// their plan), goals and the requested day's log (default: today; past days up
// to 14 back may be viewed/backfilled).
export async function GET(req: Request) {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, plan: true },
  });
  if (!user) return new Response("Not found", { status: 404 });

  const profile = await ensureProfile(user.id);
  const date = resolveLogDate(new URL(req.url).searchParams.get("date"));
  if (!date) return new Response("Invalid date - today or up to 14 days back.", { status: 400 });

  // Upsert so there's always a row (all zeros) for the UI to show.
  const today = await prisma.nutritionLog.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { userId: user.id, date },
    update: {},
  });

  return Response.json({
    tier: tierFromPlan(user.plan),
    profile: {
      ...profile,
      proteinGoal: proteinGoal(profile.bodyWeightKg, profile.proteinMultiplier),
    },
    today, // the requested day's log (field name kept for the existing UI)
    date,
  });
}
