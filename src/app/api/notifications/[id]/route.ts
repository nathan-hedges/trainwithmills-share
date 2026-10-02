import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/notifications/[id] -mark one notification as read (scoped to the
// signed-in user so you can't touch anyone else's).
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  await prisma.notification.updateMany({
    where: { id, user: { email } },
    data: { read: true },
  });

  return new Response(null, { status: 204 });
}
