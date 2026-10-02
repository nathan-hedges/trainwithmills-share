import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/clients/[id]/nutrition/insights/[insightId] -coach edits a note.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; insightId: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const { id, insightId } = await params;
  const { text } = await req.json();
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) return new Response("Text is required", { status: 400 });

  // Scope by clientId so a coach can only edit that client's notes.
  const result = await prisma.nutritionInsight.updateMany({
    where: { id: insightId, clientId: id },
    data: { text: trimmed },
  });
  if (result.count === 0) return new Response("Not found", { status: 404 });
  return Response.json({ id: insightId, text: trimmed });
}

// DELETE /api/clients/[id]/nutrition/insights/[insightId] -coach removes a note.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; insightId: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const { id, insightId } = await params;
  await prisma.nutritionInsight.deleteMany({ where: { id: insightId, clientId: id } });
  return new Response(null, { status: 204 });
}
