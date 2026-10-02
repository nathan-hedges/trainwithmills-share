import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureProfile } from "@/lib/nutrition/server";
import { computeAnalytics, deriveGoals, lastNDates } from "@/lib/nutrition/analytics";

// GET /api/clients/[id]/nutrition/insights -coach view: computed analytics
// (incl. data-driven suggestions) + the existing coach-authored notes.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;

  const profile = await ensureProfile(id);
  const dates = [...lastNDates(7, 0), ...lastNDates(7, 7)];
  const logs = await prisma.nutritionLog.findMany({ where: { userId: id, date: { in: dates } } });
  const analytics = computeAnalytics(logs, deriveGoals(profile));

  const notes = await prisma.nutritionInsight.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, text: true, createdAt: true },
  });

  return Response.json({ analytics, notes });
}

// POST /api/clients/[id]/nutrition/insights -coach adds an insight note.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;
  const { text } = await req.json();
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) return new Response("Text is required", { status: 400 });

  const note = await prisma.nutritionInsight.create({
    data: { clientId: id, text: trimmed },
    select: { id: true, text: true, createdAt: true },
  });
  return Response.json(note);
}
