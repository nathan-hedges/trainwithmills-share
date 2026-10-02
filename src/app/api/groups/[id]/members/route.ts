import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readJson, groupMemberSchema } from "@/lib/validation";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

// POST /api/groups/[id]/members - place a client in this group.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const parsed = await readJson(req, groupMemberSchema);
  if (parsed.error) return parsed.error;

  const group = await prisma.group.findUnique({ where: { id }, select: { id: true } });
  if (!group) return new Response("Group not found", { status: 404 });

  const client = await prisma.user.findUnique({
    where: { id: parsed.data.clientId },
    select: { id: true, role: true },
  });
  if (!client || client.role !== "CLIENT") return new Response("Client not found", { status: 404 });

  await prisma.user.update({ where: { id: client.id }, data: { groupId: id } });
  return Response.json({ ok: true });
}

// DELETE /api/groups/[id]/members - take a client out of this group.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const parsed = await readJson(req, groupMemberSchema);
  if (parsed.error) return parsed.error;

  // Only unassign if they're actually in THIS group.
  await prisma.user.updateMany({
    where: { id: parsed.data.clientId, groupId: id },
    data: { groupId: null },
  });
  return Response.json({ ok: true });
}
