import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { presignDownload, r2Configured } from "@/lib/r2";

/**
 * GET /api/avatars/[userId] - redirects to a short-lived signed URL for that
 * person's profile picture, so <img src> just works while the file itself stays
 * private. Any signed-in user may fetch any other's: within one coach's roster
 * these are the faces on messages and the leaderboard, which is the point.
 *
 * 404 when there's no picture - the UI falls back to initials.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (!r2Configured()) return new Response("Not found", { status: 404 });

  const { userId } = await params;
  // "me" resolves to the signed-in user - handy before their id is to hand.
  const email = session.user.email?.toLowerCase();
  const user =
    userId === "me"
      ? email
        ? await prisma.user.findUnique({ where: { email }, select: { avatarKey: true } })
        : null
      : await prisma.user.findUnique({ where: { id: userId }, select: { avatarKey: true } });
  if (!user?.avatarKey) return new Response("Not found", { status: 404 });

  const url = await presignDownload(user.avatarKey);
  return Response.redirect(url, 307);
}
