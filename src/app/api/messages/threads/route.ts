import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/messages/threads - the coach inbox: every client with their last
// message + how many of their messages are still unread.
export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: { id: true, firstName: true, lastName: true, name: true },
  });

  const rows = await Promise.all(
    clients.map(async (c) => {
      const [last, unread] = await Promise.all([
        prisma.message.findFirst({ where: { clientId: c.id }, orderBy: { createdAt: "desc" } }),
        prisma.message.count({ where: { clientId: c.id, senderRole: "client", read: false } }),
      ]);
      const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.name || "Client";
      const initials = (name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2) || "C").toUpperCase();
      const lastMessage = last ? (last.text || (last.videoKey ? "📹 Video" : "")) : "";
      return {
        clientId: c.id,
        clientName: name,
        initials,
        lastMessage,
        lastAt: last?.createdAt ?? null,
        unread,
      };
    }),
  );

  // Threads with recent activity first; the rest (no messages) after.
  rows.sort((a, b) => {
    if (!a.lastAt) return 1;
    if (!b.lastAt) return -1;
    return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
  });

  return Response.json(rows);
}
