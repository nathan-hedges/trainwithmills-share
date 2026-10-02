import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { brandedEmail, sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/ratelimit";
import { passwordRequestSchema } from "@/lib/validation";

// POST /api/password/request -start a forgot-password reset.
// Always returns 204 (never reveals whether an email is registered).
export async function POST(req: Request) {
  const limited = await rateLimit(req, "password-request", "strict");
  if (limited) return limited;

  const parsed = passwordRequestSchema.safeParse(await req.json().catch(() => ({})));
  const email = parsed.success ? parsed.data.email.toLowerCase().trim() : "";

  if (email) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Replace any outstanding tokens for this email with a fresh one.
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      await prisma.verificationToken.create({ data: { identifier: email, token, expires } });

      const appUrl = process.env.APP_URL ?? "https://trainwithmills.co.uk";
      const html = brandedEmail({
        heading: "Reset your password",
        intro: "We got a request to reset your Train with Mills password. This link expires in 1 hour.",
        button: { label: "Reset password", url: `${appUrl}/reset-password?token=${token}` },
        footerNote: "Didn't request this? You can safely ignore this email -your password won't change.",
      });
      await sendEmail({ to: email, subject: "Reset your password", html });
    }
  }

  return new Response(null, { status: 204 });
}
