import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cleanSets, setPrescription } from "@/lib/sets";
import { readJson, templateSaveSchema } from "@/lib/validation";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

    const { id } = await params;

    const templates = await prisma.template.findUnique({
        where: { id },
        include: {days: {orderBy: {dow: "asc"},
         include: {exercises: {orderBy: {order: "asc"},
            include: {exercise: true, sets: {orderBy: {order: "asc"}}}}}}}
    });

    if (!templates) {
        return new Response("Template not found", { status: 404 });
    }

    return Response.json(templates);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

    const { id } = await params;
    const parsed = await readJson(req, templateSaveSchema);
    if (parsed.error) return parsed.error;
    const { name, description, days } = parsed.data;

    const updatedTemplate = await prisma.$transaction(async (tx) => {
        await tx.templateDay.deleteMany({ where: { templateId: id } });

        return tx.template.update({
            where: { id },
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                days: {
                    create: days.map((d) => ({
                        dow: d.dow,
                        title: d.title?.trim() || "Session",
                        focus: d.focus?.trim() || "Training",
                        warmup: d.warmup?.trim() || null,
                        exercises: {
                            create: d.exercises.map((ex) => {
                                const cleaned = cleanSets(ex.sets ?? []);
                                return {
                                    exerciseId: ex.exerciseId,
                                    order: ex.order,
                                    prescription: setPrescription(cleaned),
                                    note: ex.note?.trim() || null,
                                    groupKey: ex.groupKey || null,
                                    groupType: ex.groupType || null,
                                    sets: {
                                        create: cleaned.map((s, i) => ({ order: i, ...s })),
                                    },
                                };
                            }),
                        },
                    })),
                },
            },
            include: {
                days: {
                    orderBy: { dow: "asc" },
                    include: {
                        exercises: { orderBy: { order: "asc" }, include: { exercise: true } },
                    },
                },
            },
        });
    });

    return Response.json(updatedTemplate);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

    const { id } = await params;

    try {
        await prisma.template.delete({ where: { id } });

        return new Response(null, { status: 204 });
    } catch {
        return new Response("Template not found", { status: 404 });
    }
}