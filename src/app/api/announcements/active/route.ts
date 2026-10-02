import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/announcements/active - the announcement to show this user: the most
 * recent live one addressed to them personally, then their group, then a
 * broadcast to everyone.
 */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!session?.user || !email) return new Response("Unauthorized", { status: 401 });

  const me = await prisma.user.findUnique({ where: { email }, select: { id: true, groupId: true, role: true } });
  if (!me) return Response.json(null);

  // The coach sees broadcasts only - the targeted ones are hers to send.
  const audience =
    me.role === "COACH"
      ? [{ clientId: null, groupId: null }]
      : [
          { clientId: me.id },
          ...(me.groupId ? [{ clientId: null, groupId: me.groupId }] : []),
          { clientId: null, groupId: null },
        ];

  const active = await prisma.announcement.findFirst({
    where: { showUntil: { gt: new Date() }, OR: audience },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(active);
}
