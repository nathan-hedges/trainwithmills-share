import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, stripeConfigured } from "@/lib/stripe";

// GET /api/billing/session-status?session_id=... - the /subscribe/return page
// asks how checkout went. On success we eagerly mirror the subscription status
// so the portal unlocks immediately (the webhook is still the safety net).
export async function GET(req: Request) {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });
  if (!stripeConfigured()) return new Response("Payments aren't configured yet.", { status: 503 });

  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) return new Response("session_id is required", { status: 400 });

  const me = await prisma.user.findUnique({ where: { email }, select: { id: true, stripeCustomerId: true } });
  if (!me) return new Response("User not found", { status: 404 });

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  // Only let a user query their own checkout session.
  if (String(session.customer) !== me.stripeCustomerId) return new Response("Not found", { status: 404 });

  if (session.status === "complete" && session.subscription) {
    const sub = await stripe.subscriptions.retrieve(String(session.subscription));
    await prisma.user.update({ where: { id: me.id }, data: { subscriptionStatus: sub.status } });
    return Response.json({ status: "complete", mode: "subscription", subscriptionStatus: sub.status });
  }

  // One-off Strong Girl Project payment: mark the programme paid straight away
  // (fresh enrolment - any previous group/end-email state is reset).
  if (session.status === "complete" && session.mode === "payment") {
    await prisma.user.update({
      where: { id: me.id },
      data: { programmePaidAt: new Date(), programmeEndEmailSent: false, groupId: null, status: "active" },
    });
    return Response.json({ status: "complete", mode: "payment" });
  }

  return Response.json({ status: session.status });
}
