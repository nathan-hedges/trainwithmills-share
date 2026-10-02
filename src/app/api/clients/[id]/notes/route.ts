import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

// GET /api/clients/[id]/notes - the coach's private notes about a client
// (pinned first, then newest). Never exposed to the client.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  const { id: clientId } = await params;
  const notes = await prisma.coachNote.findMany({
    where: { clientId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
  return Response.json(notes);
}

// POST /api/clients/[id]/notes - add a note. Body: { text }.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  const { id: clientId } = await params;

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return new Response("Note text is required", { status: 400 });

  const note = await prisma.coachNote.create({ data: { clientId, text: text.slice(0, 5000) } });
  return Response.json(note);
}
