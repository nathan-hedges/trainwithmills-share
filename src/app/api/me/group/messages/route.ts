import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readJson, groupMessageSchema } from "@/lib/validation";

const senderSelect = { id: true, firstName: true, lastName: true, role: true, avatarKey: true } as const;

async function me() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return null;
  return prisma.user.findUnique({ where: { email }, select: { id: true, groupId: true } });
}

/** The last 100 messages, oldest first, with `mine` computed server-side. */
async function threadFor(groupId: string, viewerId: string) {
  const rows = await prisma.groupMessage.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, text: true, createdAt: true, sender: { select: senderSelect } },
  });
  return rows.reverse().map((m) => ({ ...m, mine: m.sender.id === viewerId }));
}

// GET /api/me/group/messages - my group's chat. Opening it marks it read.
export async function GET() {
  const user = await me();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!user.groupId) return new Response("You're not in a group", { status: 404 });

  const messages = await threadFor(user.groupId, user.id);
  await prisma.user.update({ where: { id: user.id }, data: { groupChatSeenAt: new Date() } });
  return Response.json(messages);
}

// POST /api/me/group/messages - say something to the group (text only).
export async function POST(req: Request) {
  const user = await me();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!user.groupId) return new Response("You're not in a group", { status: 404 });

  const parsed = await readJson(req, groupMessageSchema);
  if (parsed.error) return parsed.error;

  await prisma.groupMessage.create({
    data: { groupId: user.groupId, senderId: user.id, text: parsed.data.text },
  });
  await prisma.user.update({ where: { id: user.id }, data: { groupChatSeenAt: new Date() } });

  return Response.json(await threadFor(user.groupId, user.id));
}
