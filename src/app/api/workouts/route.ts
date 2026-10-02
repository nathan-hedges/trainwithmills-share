import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Small helper: true only if the caller is a signed-in coach.
async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

// POST /api/workouts -create a session for a client on a given date.
export async function POST(req: Request) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

  // Read the JSON the frontend sent.
  const { clientId, date, title, focus } = await req.json();
  // Always validate the things you can't do without.
  if (!clientId || !date) {
    return new Response("clientId and date are required", { status: 400 });
  }

  try {
    const workout = await prisma.workout.create({
      data: {
        clientId,
        date,
        title: title?.trim() || "New session",
        focus: focus?.trim() || "Training",
      },
    });
    // Return INSIDE the try, where `workout` is in scope.
    return Response.json(workout);
  } catch (error) {
    // P2002 = a unique constraint failed. Ours is @@unique([clientId, date]),
    // so this means a session already exists for that client on that day.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return new Response("A session already exists for that day", { status: 409 });
    }
    console.error("Failed to create workout:", error);
    return new Response("Could not create the session", { status: 500 });
  }
}
