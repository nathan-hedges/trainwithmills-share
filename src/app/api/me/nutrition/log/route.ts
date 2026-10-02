import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { clampNum, resolveLogDate } from "@/lib/nutrition/server";

const LOG_FIELDS = ["protein", "steps", "sleep", "water", "fiveADay"];

// PATCH /api/me/nutrition/log -log values for today, or a past day (≤14 days
// back) via an optional `date` in the body. Values are absolute (the new
// total), so retries are safe.
export async function PATCH(req: Request) {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return new Response("Not found", { status: 404 });

  const body = await req.json();
  const data = Object.fromEntries(
    Object.entries(body)
      .filter(([k]) => LOG_FIELDS.includes(k))
      .map(([k, v]) => [k, clampNum(k, v)]),
  );

  const date = resolveLogDate(body.date);
  if (!date) return new Response("Invalid date - today or up to 14 days back.", { status: 400 });
  const log = await prisma.nutritionLog.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { userId: user.id, date, ...data },
    update: data,
  });

  return Response.json(log);
}
