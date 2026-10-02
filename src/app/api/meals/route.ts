import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cleanMeal } from "@/lib/nutrition/server";
import { mealsVisibleToClients } from "@/lib/settings";

// GET /api/meals -the coach always sees the database; clients only once the
// coach has switched "visible to clients" on (403 = hidden, UI shows coming soon).
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

  const isCoach = (session.user as { role?: string })?.role === "COACH";
  if (!isCoach && !(await mealsVisibleToClients())) {
    return new Response("Meals are not published yet", { status: 403 });
  }

  const meals = await prisma.meal.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return Response.json(meals);
}

// POST /api/meals -coach creates a meal.
export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "COACH") {
    return new Response("Forbidden", { status: 403 });
  }
  const data = cleanMeal(await req.json());
  if (!data.name) return new Response("Name is required", { status: 400 });
  const meal = await prisma.meal.create({ data });
  return Response.json(meal);
}
