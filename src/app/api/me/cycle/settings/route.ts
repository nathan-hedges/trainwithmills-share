import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readJson, cycleSettingsSchema } from "@/lib/validation";

async function meId() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return null;
  const me = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return me?.id ?? null;
}

// PATCH /api/me/cycle/settings - how much of this Millie can see.
export async function PATCH(req: Request) {
  const id = await meId();
  if (!id) return new Response("Unauthorized", { status: 401 });

  const parsed = await readJson(req, cycleSettingsSchema);
  if (parsed.error) return parsed.error;

  await prisma.cycleProfile.update({
    where: { userId: id },
    data: { shareLevel: parsed.data.shareLevel },
  });
  return Response.json({ ok: true });
}

/**
 * DELETE /api/me/cycle/settings - withdraw consent and erase everything.
 * Removes every logged day and clears the opt-in, so she lands back on the
 * consent screen with nothing stored. Millie's setup stays, so she can opt
 * back in later without asking for it to be configured again.
 */
export async function DELETE() {
  const id = await meId();
  if (!id) return new Response("Unauthorized", { status: 401 });

  await prisma.$transaction([
    prisma.cycleLog.deleteMany({ where: { userId: id } }),
    prisma.cycleProfile.updateMany({
      where: { userId: id },
      data: { consentAt: null, shareLevel: "minimal" },
    }),
  ]);
  return Response.json({ ok: true });
}
