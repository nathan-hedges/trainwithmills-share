
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const isCoach = (s: { user?: unknown } | null) =>
  (s?.user as { role?: string })?.role === "COACH";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  
  const session = await auth();
  if (!isCoach(session)) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const assignments = await prisma.formAssignment.findMany({
  where: { formId: id },
  orderBy: { assignedAt: "desc" },
  include: { client: { select: { firstName: true, lastName: true, name: true } } },
});
return Response.json(
  assignments.map((a) => ({
    assignmentId: a.id,
    clientId: a.clientId,
    clientName:
      [a.client.firstName, a.client.lastName].filter(Boolean).join(" ") || a.client.name || "Client",
    status: a.status,
    completedAt: a.completedAt,
    answers: a.answers ?? null,
  })),
);
}

