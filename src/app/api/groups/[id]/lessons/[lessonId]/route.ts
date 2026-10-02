import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/groups/[id]/lessons/[lessonId] - remove a posted lesson.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; lessonId: string }> },
) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const { id, lessonId } = await params;

  const { count } = await prisma.groupLesson.deleteMany({ where: { id: lessonId, groupId: id } });
  return count ? new Response(null, { status: 204 }) : new Response("Lesson not found", { status: 404 });
}
