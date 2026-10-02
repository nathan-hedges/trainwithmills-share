import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { presignDownload, r2Configured } from "@/lib/r2";

/**
 * GET /api/announcements/audio?key=... - short-lived signed URL for a voice
 * note. The coach can play any; a client only one addressed to her (directly,
 * via her group, or a broadcast to everyone).
 */
export async function GET(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });
  if (!r2Configured()) return new Response("Audio storage isn't configured.", { status: 503 });

  const key = new URL(req.url).searchParams.get("key");
  if (!key) return new Response("key is required", { status: 400 });

  const announcement = await prisma.announcement.findFirst({
    where: { audioKey: key },
    select: { clientId: true, groupId: true },
  });
  if (!announcement) return new Response("Not found", { status: 404 });

  if ((session?.user as { role?: string })?.role !== "COACH") {
    const me = await prisma.user.findUnique({ where: { email }, select: { id: true, groupId: true } });
    if (!me) return new Response("Forbidden", { status: 403 });

    const forMe =
      announcement.clientId === me.id ||
      (announcement.clientId === null &&
        (announcement.groupId === null || announcement.groupId === me.groupId));
    if (!forMe) return new Response("Forbidden", { status: 403 });
  }

  const url = await presignDownload(key);
  return Response.json({ url });
}
