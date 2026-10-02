import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/forms/clients - the { id, name }[] list the assign modal needs.
export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT", status: "active" },
    select: { id: true, firstName: true, lastName: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(
    clients.map((c) => ({
      id: c.id,
      name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.name || "Client",
    })),
  );
}
