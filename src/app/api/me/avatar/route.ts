import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { presignUpload, r2Configured } from "@/lib/r2";

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
/** Cropped client-side to 512px before upload, so this is generous. */
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

async function meId() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return null;
  const me = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return me?.id ?? null;
}

// POST /api/me/avatar - presigned PUT for my own profile picture.
export async function POST(req: Request) {
  const id = await meId();
  if (!id) return new Response("Unauthorized", { status: 401 });
  if (!r2Configured()) return new Response("Image storage isn't configured.", { status: 503 });

  const { contentType, ext, size } = await req.json().catch(() => ({}));
  const cleanExt = String(ext ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (typeof contentType !== "string" || !contentType.startsWith("image/") || !ALLOWED_EXT.has(cleanExt)) {
    return new Response("Only JPG, PNG or WebP images are allowed.", { status: 400 });
  }
  if (typeof size === "number" && size > MAX_AVATAR_BYTES) {
    return new Response("That image is too large.", { status: 413 });
  }

  const key = `avatars/${id}/${randomUUID()}.${cleanExt}`;
  const uploadUrl = await presignUpload(key, contentType);
  return Response.json({ uploadUrl, key });
}

// PUT /api/me/avatar - point my profile at the uploaded key (or clear it).
export async function PUT(req: Request) {
  const id = await meId();
  if (!id) return new Response("Unauthorized", { status: 401 });

  const { key } = await req.json().catch(() => ({}));
  const clean = typeof key === "string" && key.startsWith(`avatars/${id}/`) ? key : null;
  if (key && !clean) return new Response("That isn't your image.", { status: 400 });

  await prisma.user.update({ where: { id }, data: { avatarKey: clean } });
  return Response.json({ ok: true, avatarKey: clean });
}

// DELETE /api/me/avatar - go back to initials.
export async function DELETE() {
  const id = await meId();
  if (!id) return new Response("Unauthorized", { status: 401 });
  await prisma.user.update({ where: { id }, data: { avatarKey: null } });
  return Response.json({ ok: true });
}
