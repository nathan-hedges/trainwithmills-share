import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { presignDownload, r2Configured } from "@/lib/r2";

// GET /api/messages/video?key=... - returns a short-lived signed URL to play a
// private video. Only the coach, or the client whose thread it belongs to, may
// fetch it.
export async function GET(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });
  if (!r2Configured()) return new Response("Video storage isn't configured.", { status: 503 });

  const key = new URL(req.url).searchParams.get("key");
  if (!key) return new Response("key is required", { status: 400 });

  // The video must belong to a real message; check the requester is a party to it.
  const message = await prisma.message.findFirst({ where: { videoKey: key }, select: { clientId: true } });
  if (!message) return new Response("Not found", { status: 404 });

  const role = (session?.user as { role?: string })?.role;
  if (role !== "COACH") {
    const me = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!me || me.id !== message.clientId) return new Response("Forbidden", { status: 403 });
  }

  const url = await presignDownload(key);
  return Response.json({ url });
}
