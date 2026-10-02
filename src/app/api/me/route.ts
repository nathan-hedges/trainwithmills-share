import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const fields = { id: true, firstName: true, lastName: true, email: true,
  role: true, plan: true, goal: true, program: true, status: true,
  notifyMessages: true, notifySummary: true, notifyReminders: true, notifyForms: true } as const;

const ALLOWED = ["firstName", "lastName", "notifyMessages", "notifySummary", "notifyReminders", "notifyForms"];

export async function GET() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });
  return Response.json(await prisma.user.findUnique({ where: { email }, select: fields }));
}

export async function PATCH(req: Request) {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();

  const data = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)));

  const updated = await prisma.user.update({where: {email}, data, select: fields})

  return Response.json(updated);
}