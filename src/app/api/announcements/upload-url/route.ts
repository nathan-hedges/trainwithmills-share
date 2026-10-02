import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { presignUpload, r2Configured } from "@/lib/r2";
import { readJson, uploadUrlSchema } from "@/lib/validation";

const ALLOWED_EXT = new Set(["webm", "mp4", "m4a", "mp3", "ogg", "wav"]);
/** Voice notes are short; 25 MB is far more than a few minutes of speech. */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/**
 * POST /api/announcements/upload-url - coach-only presigned PUT for a recorded
 * voice note. Returns { uploadUrl, key }; the announcement then stores the key.
 */
export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  if (!r2Configured()) return new Response("Audio storage isn't configured.", { status: 503 });

  const email = session?.user?.email?.toLowerCase();
  const me = email ? await prisma.user.findUnique({ where: { email }, select: { id: true } }) : null;
  if (!me) return new Response("Not found", { status: 404 });

  const parsed = await readJson(req, uploadUrlSchema);
  if (parsed.error) return parsed.error;
  const { contentType, ext, size } = parsed.data;

  const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!contentType.startsWith("audio/") || !ALLOWED_EXT.has(cleanExt)) {
    return new Response("Only audio recordings are allowed.", { status: 400 });
  }
  if (size != null && size > MAX_AUDIO_BYTES) {
    return new Response("That recording is too long - keep voice notes under a few minutes.", { status: 413 });
  }

  const key = `voice/${me.id}/${randomUUID()}.${cleanExt}`;
  const uploadUrl = await presignUpload(key, contentType);
  return Response.json({ uploadUrl, key });
}
