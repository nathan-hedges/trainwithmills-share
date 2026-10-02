import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/announcements/[id] -coach removes an announcement.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;
  await prisma.announcement.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
