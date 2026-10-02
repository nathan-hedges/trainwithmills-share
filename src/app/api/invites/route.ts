import crypto from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { brandedEmail, escapeHtml, sendEmail } from "@/lib/email";
import { readJson, inviteCreateSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  const parsed = await readJson(req, inviteCreateSchema);
  if (parsed.error) return parsed.error;
  const {
    email,
    firstName,
    lastName,
    plan,
    dateOfBirth,
    lifestyle,
    injuries,
    goal,
    cycleTracking,
    contraception,
    avgCycleLength,
    avgPeriodLength,
  } = parsed.data;

  const token = crypto.randomBytes(32).toString("hex"); // long, unguessable
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.invite.create({
    data: {
      email: email.toLowerCase(),
      firstName: firstName || null,
      lastName: lastName || null,
      plan,
      token,
      expiresAt,
      // Everything below comes from the onboarding call and is optional.
      dateOfBirth: dateOfBirth ? new Date(`${dateOfBirth}T00:00:00Z`) : null,
      lifestyle: lifestyle || null,
      injuries: injuries || null,
      goal: goal || null,
      cycleTracking: Boolean(cycleTracking),
      contraception: cycleTracking ? contraception || "none" : null,
      avgCycleLength: cycleTracking ? (avgCycleLength ?? 28) : null,
      avgPeriodLength: cycleTracking ? (avgPeriodLength ?? 5) : null,
    },
  });

  const link = `${process.env.APP_URL ?? new URL(req.url).origin}/welcome?token=${token}`;

  // Send the branded invite email. sendEmail no-ops when email isn't configured,
  // so the request never fails - the coach can still copy the link below.
  await sendEmail({
    to: email,
    subject: "Your Train with Mills account is ready",
    html: brandedEmail({
      heading: `You're in, ${escapeHtml(firstName ?? "there")}`,
      intro: `You're all set for the ${escapeHtml(plan)}. Create your account and let&rsquo;s get started.`,
      button: { label: "Create your account", url: link },
      footerNote: "This link expires in 7 days. If you weren't expecting this, you can ignore it.",
      preheader: "Your Train with Mills account is ready.",
    }),
  });

  // Return the token so the coach UI can show + copy the sign-up link.
  return Response.json({ ok: true, token, link });
}

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH")
    return new Response("Forbidden", { status: 403 });
  const invites = await prisma.invite.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json(invites);
}