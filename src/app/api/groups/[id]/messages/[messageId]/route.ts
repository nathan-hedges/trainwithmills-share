import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/groups/[id]/messages/[messageId] - the coach can remove any
// message from a group chat (keeps the space safe).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const { id, messageId } = await params;

  const { count } = await prisma.groupMessage.deleteMany({ where: { id: messageId, groupId: id } });
  return count ? new Response(null, { status: 204 }) : new Response("Message not found", { status: 404 });
}
