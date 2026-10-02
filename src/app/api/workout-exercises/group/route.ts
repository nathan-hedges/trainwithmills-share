import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/workout-exercises/group -group a set of placed exercises into a
// superset/circuit, or ungroup them.
// Body: { ids: string[], groupType: "superset" | "circuit" | null }
//  - a non-null groupType assigns all `ids` a shared new groupId
//  - null clears the group from `ids`
export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }

  const { ids, groupType } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return new Response("ids are required", { status: 400 });
  }

  if (groupType === null || groupType === undefined) {
    // Ungroup.
    await prisma.workoutExercise.updateMany({
      where: { id: { in: ids } },
      data: { groupId: null, groupType: null },
    });
  } else {
    if (groupType !== "superset" && groupType !== "circuit") {
      return new Response("groupType must be 'superset' or 'circuit'", { status: 400 });
    }
    // One shared id ties the exercises together as a group.
    const groupId = randomUUID();
    await prisma.workoutExercise.updateMany({
      where: { id: { in: ids } },
      data: { groupId, groupType },
    });
  }

  return new Response("OK", { status: 200 });
}
