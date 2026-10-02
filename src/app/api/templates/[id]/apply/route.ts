import { auth } from "@/auth";
import { applyTemplateToClient, loadTemplateForApply } from "@/lib/applyTemplate";

// POST /api/templates/[id]/apply -stamp a template onto a client's week.
// Body: { clientId, weekStart }.  This REPLACES that week's existing sessions.
// (The shared logic lives in lib/applyTemplate.ts - also used by group apply.)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params; // the template id from the URL
  const { clientId, weekStart } = await req.json();
  if (!clientId || !weekStart) {
    return new Response("clientId and weekStart are required", { status: 400 });
  }

  const template = await loadTemplateForApply(id);
  if (!template) return new Response("Template not found", { status: 404 });

  await applyTemplateToClient(template, clientId, weekStart);
  return new Response("Applied", { status: 200 });
}
