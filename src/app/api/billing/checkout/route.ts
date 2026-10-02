import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { hasPortalAccess, planBilling } from "@/lib/billing";

// POST /api/billing/checkout - start an embedded Checkout session for the
// signed-in client's plan. Returns { clientSecret } for <EmbeddedCheckout>.
export async function POST() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });
  if (!stripeConfigured()) return new Response("Payments aren't configured yet.", { status: 503 });

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true,
      plan: true, billingExempt: true, subscriptionStatus: true, stripeCustomerId: true,
      programmePaidAt: true, group: { select: { startDate: true } },
    },
  });
  if (!user || user.role !== "CLIENT") return new Response("Clients only", { status: 403 });
  if (hasPortalAccess(user)) return new Response("You already have access.", { status: 400 });

  const billing = planBilling(user.plan);
  if (!billing) {
    return new Response("No plan is set on your account yet - message me and I'll sort it.", { status: 400 });
  }
  if (!billing.priceId) {
    // Coach-side misconfiguration, not the client's fault: the plan exists but
    // its STRIPE_PRICE_* env var isn't set.
    return new Response("This plan isn't connected to payments yet - I've been told, and I'll sort it.", { status: 503 });
  }

  try {
    // One Stripe customer per user, created on first checkout. A stored id can
    // go stale when Stripe modes switch (a live-mode customer doesn't exist in
    // test mode and vice versa) - verify it and self-heal with a fresh one.
    let customerId = user.stripeCustomerId;
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if ((existing as { deleted?: boolean }).deleted) customerId = null;
      } catch {
        customerId = null; // unknown in this mode - recreate below
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const appUrl = process.env.APP_URL ?? "https://trainwithmills.co.uk";
    // Strong Girl Project = a one-off payment; Your Strong Era = a subscription.
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page", // pairs with <EmbeddedCheckout> on /subscribe
      mode: billing.mode,
      customer: customerId,
      line_items: [{ price: billing.priceId, quantity: 1 }],
      allow_promotion_codes: true, // promo-code box in checkout (codes made in the dashboard)
      metadata: { userId: user.id }, // read back by the webhook for one-off payments
      ...(billing.mode === "subscription"
        ? { subscription_data: { metadata: { userId: user.id } } }
        : {}),
      return_url: `${appUrl}/subscribe/return?session_id={CHECKOUT_SESSION_ID}`,
    });

    return Response.json({ clientSecret: session.client_secret });
  } catch (err) {
    // Surface WHAT failed (shown by the /subscribe error state) instead of a bare 500.
    console.error("Checkout session failed:", err);
    const message = err instanceof Error ? err.message : "Unknown Stripe error";
    return new Response(`Couldn't start checkout: ${message}`, { status: 502 });
  }
}
