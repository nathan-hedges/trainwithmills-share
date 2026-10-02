import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { token, firstName, lastName, password } = await req.json();

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return new Response("Invalid or expired invite", { status: 400 });
  }
  if (await prisma.user.findUnique({ where: { email: invite.email } })) {
    return new Response("Account already exists", { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email: invite.email,
      firstName: firstName ?? invite.firstName,
      lastName: lastName ?? invite.lastName,
      passwordHash: password ? await bcrypt.hash(password, 12) : null,
      role: "CLIENT",
      plan: invite.plan,            // the plan carries over from the invite
      emailVerified: new Date(),    // they proved they own the email via the link
      // What Millie captured on the onboarding call.
      dateOfBirth: invite.dateOfBirth,
      lifestyle: invite.lifestyle,
      injuries: invite.injuries,
      goal: invite.goal,
    },
  });

  // If cycle tracking was arranged on the call, set the profile up now - she
  // then only has to consent, rather than waiting on Millie to configure it.
  if (invite.cycleTracking) {
    await prisma.cycleProfile.create({
      data: {
        userId: user.id,
        contraception: invite.contraception ?? "none",
        avgCycleLength: invite.avgCycleLength ?? 28,
        avgPeriodLength: invite.avgPeriodLength ?? 5,
        setupByCoachAt: new Date(),
      },
    });
  }
  await prisma.invite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });

  return Response.json({ ok: true });
}