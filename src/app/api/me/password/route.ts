import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/me/password -change the signed-in user's password.
// Requires the current password (unless they're a Google-only account with no
// password set yet, in which case this sets one).
export async function POST(req: Request) {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return new Response("New password must be at least 8 characters.", { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
  if (!user) return new Response("Not found", { status: 404 });

  if (user.passwordHash) {
    const ok = await bcrypt.compare(String(currentPassword ?? ""), user.passwordHash);
    if (!ok) return new Response("Your current password is incorrect.", { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return new Response(null, { status: 204 });
}
