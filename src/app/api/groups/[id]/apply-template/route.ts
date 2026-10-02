import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { applyTemplateToClient, loadTemplateForApply } from "@/lib/applyTemplate";
import { readJson, groupApplyTemplateSchema } from "@/lib/validation";

// POST /api/groups/[id]/apply-template - stamp a template week onto EVERY
// member of the group at once. Body: { templateId, weekStart }.
// Same behaviour as the individual apply: it replaces that week per member.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;

  const parsed = await readJson(req, groupApplyTemplateSchema);
  if (parsed.error) return parsed.error;
  const { templateId, weekStart } = parsed.data;

  const group = await prisma.group.findUnique({
    where: { id },
    select: { id: true, members: { select: { id: true } } },
  });
  if (!group) return new Response("Group not found", { status: 404 });
  if (group.members.length === 0) return new Response("This group has no members yet", { status: 400 });

  const template = await loadTemplateForApply(templateId);
  if (!template) return new Response("Template not found", { status: 404 });

  // Each member is applied in their own transaction, so one failure can't
  // leave EVERYONE half-done - we report how far we got instead.
  let applied = 0;
  for (const m of group.members) {
    try {
      await applyTemplateToClient(template, m.id, weekStart);
      applied++;
    } catch (err) {
      console.error("Group template apply failed for member", m.id, err);
    }
  }

  if (applied === 0) return new Response("The apply failed for every member - check the server logs.", { status: 500 });
  return Response.json({ applied, of: group.members.length });
}
