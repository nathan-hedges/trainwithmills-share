import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureProfile, proteinGoal } from "@/lib/nutrition/server";
import { tierFromPlan } from "@/lib/nutrition/plan";

// GET /api/clients/[id]/nutrition -coach view of a client's tier (from their
// plan) + goals.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, plan: true },
  });
  if (!user) return new Response("Not found", { status: 404 });

  const profile = await ensureProfile(user.id);
  return Response.json({
    tier: tierFromPlan(user.plan),
    profile: {
      ...profile,
      proteinGoal: proteinGoal(profile.bodyWeightKg, profile.proteinMultiplier),
    },
  });
}
