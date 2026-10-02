import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ratelimit";
import { readJson, passwordResetSchema } from "@/lib/validation";

// POST /api/password/reset -finish a forgot-password reset with the emailed token.
export async function POST(req: Request) {
  const limited = await rateLimit(req, "password-reset", "strict");
  if (limited) return limited;

  const parsed = await readJson(req, passwordResetSchema);
  if (parsed.error) return parsed.error;
  const { token, password } = parsed.data;

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.expires < new Date()) {
    return new Response("This reset link is invalid or has expired.", { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { email: record.identifier }, data: { passwordHash } });
  await prisma.verificationToken.delete({ where: { token } });

  return new Response(null, { status: 204 });
}
