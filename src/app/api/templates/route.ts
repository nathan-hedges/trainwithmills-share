import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

export async function GET() {
    if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
    const templates = await prisma.template.findMany({
        orderBy: { createdAt: "desc" },
        include: { days: { include: { exercises: true } } }
    });
    return Response.json(templates);
}

export async function POST(req: Request) {
    if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

    const { name, description } = await req.json();

    if (!name || typeof name !== "string" || !name.trim()) {
        return new Response("Name is required", { status: 400 });
    }

    const coach = await prisma.user.findUnique({
        where: { email : (await auth())?.user?.email?.toLowerCase() },
        select: { id: true },
    });

    if (!coach) {
        return new Response("Coach profile not found", { status: 404 });
    }

    const template = await prisma.template.create({
        data: {
            coachId: coach.id,
            name: name.trim(),
            description: description?.trim() || null,
        },
    });
    return Response.json(template);
}