import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureProfile } from "@/lib/nutrition/server";
import { tierFromPlan } from "@/lib/nutrition/plan";
import { computeAnalytics, deriveGoals, lastNDates } from "@/lib/nutrition/analytics";

// GET /api/me/nutrition/insights -the signed-in client's computed weekly
// analytics, plus any coach-authored notes (shown on the Performance tier).
export async function GET() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, plan: true },
  });
  if (!user) return new Response("Not found", { status: 404 });

  const profile = await ensureProfile(user.id);
  const dates = [...lastNDates(7, 0), ...lastNDates(7, 7)];
  const logs = await prisma.nutritionLog.findMany({ where: { userId: user.id, date: { in: dates } } });
  const analytics = computeAnalytics(logs, deriveGoals(profile));

  const notes = await prisma.nutritionInsight.findMany({
    where: { clientId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, text: true, createdAt: true },
  });

  return Response.json({ tier: tierFromPlan(user.plan), analytics, notes });
}
