import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendNotificationEmail } from "@/lib/email";
import type { MessageDTO, SenderRole } from "@/lib/messages/types";

/**
 * Resolve the signed-in user + which thread they're acting on.
 * - A CLIENT only ever sees their own thread (clientId = their own id).
 * - A COACH must name the thread via ?clientId=… (GET) or { clientId } (POST).
 */
async function resolveThread(
  req: Request,
  bodyClientId?: string,
): Promise<{ error: Response } | { role: SenderRole; clientId: string }> {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return { error: new Response("Unauthorized", { status: 401 }) };

  const me = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!me) return { error: new Response("User not found", { status: 404 }) };

  const role: SenderRole = me.role === "COACH" ? "coach" : "client";
  if (role === "client") return { role, clientId: me.id };

  const clientId = bodyClientId ?? new URL(req.url).searchParams.get("clientId") ?? "";
  if (!clientId) return { error: new Response("clientId is required", { status: 400 }) };
  return { role, clientId };
}

function toDTO(m: {
  id: string;
  senderRole: string;
  text: string;
  videoKey: string | null;
  verdict: string | null;
  verdictNote: string | null;
  createdAt: Date;
}, myRole: SenderRole): MessageDTO {
  return {
    id: m.id,
    senderRole: m.senderRole as SenderRole,
    text: m.text,
    videoKey: m.videoKey,
    verdict: m.verdict as MessageDTO["verdict"],
    verdictNote: m.verdictNote,
    createdAt: m.createdAt.toISOString(),
    mine: m.senderRole === myRole,
  };
}

// GET /api/messages?clientId=…  - list a thread (oldest first), and mark the
// OTHER party's messages as read.
export async function GET(req: Request) {
  const t = await resolveThread(req);
  if ("error" in t) return t.error;
  const { role, clientId } = t;

  const messages = await prisma.message.findMany({ where: { clientId }, orderBy: { createdAt: "asc" } });

  const otherRole: SenderRole = role === "coach" ? "client" : "coach";
  await prisma.message.updateMany({
    where: { clientId, senderRole: otherRole, read: false },
    data: { read: true },
  });

  return Response.json(messages.map((m) => toDTO(m, role)));
}

// POST /api/messages  - send a text and/or video message into a thread, then
// notify the recipient (in-portal always; email if they've opted in).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const t = await resolveThread(req, typeof body.clientId === "string" ? body.clientId : undefined);
  if ("error" in t) return t.error;
  const { role, clientId } = t;

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const videoKey = typeof body.videoKey === "string" ? body.videoKey : null;
  if (!text && !videoKey) return new Response("Message is empty", { status: 400 });

  const message = await prisma.message.create({ data: { clientId, senderRole: role, text, videoKey } });

  if (role === "client") {
    const coach = await prisma.user.findFirst({
      where: { role: "COACH" },
      select: { id: true, email: true, notifyMessages: true },
    });
    if (coach) {
      await createNotification(coach.id, "message", "New message from a client", "/admin/messages");
      if (coach.notifyMessages) await sendNotificationEmail(coach.email, "New message from a client", "/admin/messages");
    }
  } else {
    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: { email: true, notifyMessages: true },
    });
    if (client) {
      await createNotification(clientId, "message", "New message from me", "/portal/messages");
      if (client.notifyMessages) await sendNotificationEmail(client.email, "New message from me", "/portal/messages");
    }
  }

  return Response.json(toDTO(message, role));
}
