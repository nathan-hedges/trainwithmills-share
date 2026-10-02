import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; // params is async in this Next.js version
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return new Response("Invalid", { status: 404 });
  }
  // Only send back what the page needs - never the token itself.
  return Response.json({ email: invite.email, firstName: invite.firstName, lastName: invite.lastName, plan: invite.plan });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH")
    return new Response("Forbidden", { status: 403 });
  const { token } = await params;
  await prisma.invite.update({ where: { token }, data: { status: "REVOKED" } });
  return Response.json({ ok: true });
}