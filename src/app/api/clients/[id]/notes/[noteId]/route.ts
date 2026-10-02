import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

// PATCH /api/clients/[id]/notes/[noteId] - toggle pin. Body: { pinned }.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  const { id: clientId, noteId } = await params;
  const body = await req.json().catch(() => ({}));

  const result = await prisma.coachNote.updateMany({
    where: { id: noteId, clientId },
    data: { pinned: Boolean(body.pinned) },
  });
  if (result.count === 0) return new Response("Not found", { status: 404 });
  return Response.json({ pinned: Boolean(body.pinned) });
}

// DELETE /api/clients/[id]/notes/[noteId]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  const { id: clientId, noteId } = await params;

  const result = await prisma.coachNote.deleteMany({ where: { id: noteId, clientId } });
  if (result.count === 0) return new Response("Not found", { status: 404 });
  return new Response(null, { status: 204 });
}
