import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notifications -the signed-in user's recent notifications.
export async function GET() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { user: { email } },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, type: true, title: true, link: true, read: true, createdAt: true },
  });

  return Response.json(notifications);
}

// PATCH /api/notifications -mark all of the user's notifications as read.
export async function PATCH() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  await prisma.notification.updateMany({
    where: { user: { email }, read: false },
    data: { read: true },
  });

  return new Response(null, { status: 204 });
}
