import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readJson, groupMessageSchema } from "@/lib/validation";

const senderSelect = { id: true, firstName: true, lastName: true, role: true, avatarKey: true } as const;

async function coachUser() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") return null;
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

async function thread(groupId: string, viewerId: string) {
  const rows = await prisma.groupMessage.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, text: true, createdAt: true, sender: { select: senderSelect } },
  });
  return rows.reverse().map((m) => ({ ...m, mine: m.sender.id === viewerId }));
}

// GET /api/groups/[id]/messages - the coach's view of a group chat.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const coach = await coachUser();
  if (!coach) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  return Response.json(await thread(id, coach.id));
}

// POST /api/groups/[id]/messages - Millie posts to the group.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const coach = await coachUser();
  if (!coach) return new Response("Forbidden", { status: 403 });
  const { id } = await params;

  const group = await prisma.group.findUnique({ where: { id }, select: { id: true } });
  if (!group) return new Response("Group not found", { status: 404 });

  const parsed = await readJson(req, groupMessageSchema);
  if (parsed.error) return parsed.error;

  await prisma.groupMessage.create({ data: { groupId: id, senderId: coach.id, text: parsed.data.text } });
  return Response.json(await thread(id, coach.id));
}
