import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GUIDANCE_PHASES } from "@/lib/cycle";
import { readJson, cycleGuidanceSchema } from "@/lib/validation";

/**
 * Millie's phase guidance - her words on training, written in Settings and shown
 * to clients. Anything she hasn't written comes back empty, and the UI simply
 * doesn't show a card for it.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const stored = await prisma.cycleGuidance.findMany();
  const byPhase = new Map(stored.map((g) => [g.phase, g]));

  // Always return all four phases in order so the editor has a row each.
  const rows = GUIDANCE_PHASES.map((phase) => {
    const found = byPhase.get(phase);
    return { phase, training: found?.training ?? "", written: Boolean(found?.training) };
  });
  return Response.json(rows);
}

// PUT /api/cycle-guidance - save one phase (coach only).
export async function PUT(req: Request) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  const parsed = await readJson(req, cycleGuidanceSchema);
  if (parsed.error) return parsed.error;
  const { phase, training } = parsed.data;

  const saved = await prisma.cycleGuidance.upsert({
    where: { phase },
    create: { phase, training },
    update: { training },
  });
  return Response.json(saved);
}
