import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { createNotification } from "@/lib/notifications";
import { brandedEmail, sendEmail } from "@/lib/email";

/**
 * POST /api/stripe/webhook - Stripe tells us what's true about subscriptions.
 * This endpoint is the single source of truth for User.subscriptionStatus:
 * the portal gate reads that column, so access flips on/off automatically.
 *
 * Configure in Stripe (dashboard → Developers → Webhooks, or `stripe listen`):
 *   checkout.session.completed, customer.subscription.created,
 *   customer.subscription.updated, customer.subscription.deleted
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(String(session.subscription));
        await syncSubscription(sub);
      }
      if (session.mode === "payment") {
        await recordProgrammePayment(session);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object);
      break;
    }
    default:
      break; // ignore anything we didn't subscribe to
  }

  return Response.json({ received: true });
}

/**
 * A completed one-off checkout = a Strong Girl Project purchase. Mark the
 * programme paid (resetting any previous group/end-email state so re-enrolment
 * works) and tell the coach she has someone to place in a group.
 */
async function recordProgrammePayment(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = session.customer ? String(session.customer) : null;
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, firstName: true, lastName: true } })
    : customerId
      ? await prisma.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true, firstName: true, lastName: true } })
      : null;
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { programmePaidAt: new Date(), programmeEndEmailSent: false, groupId: null, status: "active" },
  });

  const coach = await prisma.user.findFirst({ where: { role: "COACH" }, select: { id: true } });
  if (coach) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "A client";
    await createNotification(
      coach.id,
      "summary",
      `${name} has paid for the Strong Girl Project - place them in a group`,
      "/admin/groups",
    );
  }
}

/** Mirror a subscription's status onto the matching user + notify coach and client. */
async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = String(sub.customer);
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true, email: true, firstName: true, lastName: true, subscriptionStatus: true },
  });
  if (!user) return; // customer we don't know (e.g. created directly in the dashboard)

  // "canceled" arrives via subscription.deleted; everything else via updated.
  const status = sub.status;
  if (user.subscriptionStatus === status) return;

  await prisma.user.update({
    where: { id: user.id },
    // A fully-cancelled subscription also pauses the client on the roster
    // (the billing gate already locks them out via subscriptionStatus).
    data: { subscriptionStatus: status, ...(status === "canceled" ? { status: "paused" } : {}) },
  });

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "A client";
  const coach = await prisma.user.findFirst({ where: { role: "COACH" }, select: { id: true } });
  const appUrl = process.env.APP_URL ?? "https://trainwithmills.co.uk";

  if (status === "past_due" || status === "unpaid") {
    if (coach) {
      await createNotification(coach.id, "alert", `${name}'s payment failed - portal access is paused`, `/admin/clients/${user.id}`);
    }
    // Tell the client how to get back in (on top of Stripe's own retry emails).
    await sendEmail({
      to: user.email,
      subject: "Your Train with Mills payment didn't go through",
      html: brandedEmail({
        heading: "Your payment didn't go through",
        intro: `Hi ${user.firstName || "there"}, your latest subscription payment failed, so your portal is paused for now. Update your card and you'll be back in straight away - your plan and progress are all safe.`,
        button: { label: "Update your card", url: `${appUrl}/subscribe` },
        footerNote: "Card payments sometimes fail for simple reasons - an expired card or a bank check. It only takes a minute to fix.",
      }),
    }).catch(() => {});
  } else if (status === "canceled") {
    if (coach) {
      await createNotification(coach.id, "alert", `${name}'s subscription has ended`, `/admin/clients/${user.id}`);
    }
  } else if (status === "active" && ["past_due", "unpaid", "canceled", "incomplete", null].includes(user.subscriptionStatus)) {
    if (coach) {
      await createNotification(coach.id, "summary", `${name}'s subscription is active`, `/admin/clients/${user.id}`);
    }
  }
}
