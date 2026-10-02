import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { presignUpload, r2Configured } from "@/lib/r2";
import { rateLimit } from "@/lib/ratelimit";
import { readJson, uploadUrlSchema } from "@/lib/validation";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/uploads";
import { canSendFormVideos } from "@/lib/nutrition/plan";

const ALLOWED_EXT = new Set(["mp4", "mov", "m4v", "webm"]);

// POST /api/messages/upload-url - hand the browser a presigned PUT URL so it can
// upload a video straight to R2. Returns { uploadUrl, key }; the client then
// sends a message carrying that key.
export async function POST(req: Request) {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });
  if (!r2Configured()) return new Response("Video storage isn't configured.", { status: 503 });

  // Light per-user cap on how often someone can request an upload URL.
  const limited = await rateLimit(req, "upload-url", "standard", email);
  if (limited) return limited;

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, plan: true } });
  if (!user) return new Response("Not found", { status: 404 });

  // Video form checks are a Beginner-Reset-and-above feature. The coach can
  // always attach; a client needs a qualifying plan.
  if (user.role !== "COACH" && !canSendFormVideos(user.plan)) {
    return new Response("Video form checks aren't available on your current plan.", { status: 403 });
  }

  const parsed = await readJson(req, uploadUrlSchema);
  if (parsed.error) return parsed.error;
  const { contentType, ext, size } = parsed.data;

  const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!contentType.startsWith("video/") || !ALLOWED_EXT.has(cleanExt)) {
    return new Response("Only video files (mp4, mov, m4v, webm) are allowed.", { status: 400 });
  }
  if (size != null && size > MAX_UPLOAD_BYTES) {
    return new Response(`Video is too large (max ${MAX_UPLOAD_MB} MB after compression).`, { status: 413 });
  }

  const key = `videos/${user.id}/${randomUUID()}.${cleanExt}`;
  const uploadUrl = await presignUpload(key, contentType);

  return Response.json({ uploadUrl, key });
}
