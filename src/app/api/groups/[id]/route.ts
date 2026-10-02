import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readJson, groupSaveSchema } from "@/lib/validation";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

// PATCH /api/groups/[id] - rename / move the start date.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const parsed = await readJson(req, groupSaveSchema);
  if (parsed.error) return parsed.error;
  const { name, startDate, callSchedule, callLink } = parsed.data;

  try {
    const group = await prisma.group.update({
      where: { id },
      data: {
        name,
        startDate: new Date(`${startDate}T00:00:00Z`),
        callSchedule: callSchedule || null,
        callLink: callLink || null,
      },
    });
    return Response.json(group);
  } catch {
    return new Response("Group not found", { status: 404 });
  }
}

// DELETE /api/groups/[id] - remove the group; members simply become
// unassigned again (their groupId is set null by the FK).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  try {
    await prisma.group.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return new Response("Group not found", { status: 404 });
  }
}
