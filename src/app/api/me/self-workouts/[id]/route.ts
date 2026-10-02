import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/me/self-workouts/[id] — remove one of MY own-logged sessions.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return new Response("User not found", { status: 404 });

  const { id } = await params;
  // deleteMany scoped to my clientId = ownership check + delete in one query.
  const result = await prisma.selfWorkout.deleteMany({ where: { id, clientId: user.id } });
  if (result.count === 0) return new Response("Not found", { status: 404 });

  return new Response(null, { status: 204 });
}
