import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendNotificationEmail } from "@/lib/email";

// POST /api/messages/[id]/verdict - coach marks a client's video "good" or
// "needs_work" with an optional note, and the client is notified.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const { verdict, note } = await req.json().catch(() => ({}));
  if (verdict !== "good" && verdict !== "needs_work") {
    return new Response("verdict must be 'good' or 'needs_work'", { status: 400 });
  }

  const message = await prisma.message.findUnique({ where: { id }, select: { videoKey: true, clientId: true } });
  if (!message?.videoKey) return new Response("Not a video message", { status: 404 });

  await prisma.message.update({
    where: { id },
    data: { verdict, verdictNote: typeof note === "string" ? note.trim() || null : null },
  });

  // Tell the client their footage was reviewed (hub always, email if opted in).
  const client = await prisma.user.findUnique({
    where: { id: message.clientId },
    select: { email: true, notifyMessages: true },
  });
  if (client) {
    const title = verdict === "good" ? "I've reviewed your video - looking good!" : "I've reviewed your video";
    await createNotification(message.clientId, "message", title, "/portal/messages");
    if (client.notifyMessages) await sendNotificationEmail(client.email, title, "/portal/messages");
  }

  return Response.json({ verdict, verdictNote: typeof note === "string" ? note.trim() || null : null });
}
