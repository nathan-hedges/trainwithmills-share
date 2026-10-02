import { auth } from "@/auth";
import { mealsVisibleToClients, setMealsVisibleToClients } from "@/lib/settings";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

// GET /api/meals/visibility — coach reads the toggle state.
export async function GET() {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  return Response.json({ visible: await mealsVisibleToClients() });
}

// PUT /api/meals/visibility — coach shows/hides the meal database for clients.
// Body: { visible: boolean }
export async function PUT(req: Request) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  const body = await req.json().catch(() => ({}));
  const visible = Boolean(body.visible);
  await setMealsVisibleToClients(visible);
  return Response.json({ visible });
}
