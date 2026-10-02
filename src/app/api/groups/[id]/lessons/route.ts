import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { readJson, groupLessonSchema } from "@/lib/validation";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

// POST /api/groups/[id]/lessons - post this week's mini lesson to the group.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  const { id } = await params;

  const group = await prisma.group.findUnique({ where: { id }, select: { id: true } });
  if (!group) return new Response("Group not found", { status: 404 });

  const parsed = await readJson(req, groupLessonSchema);
  if (parsed.error) return parsed.error;
  const { title, notes, link } = parsed.data;

  const lesson = await prisma.groupLesson.create({
    data: { groupId: id, title, notes, link: link || null },
  });

  // Everyone in the group hears about a new lesson (bell only, no email).
  const members = await prisma.user.findMany({ where: { groupId: id }, select: { id: true } });
  for (const m of members) {
    await createNotification(m.id, "summary", `New lesson from me: ${title}`, "/portal/group");
  }

  return Response.json(lesson);
}
