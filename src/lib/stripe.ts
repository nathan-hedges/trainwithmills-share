import Stripe from "stripe";

/**
 * Server-side Stripe client. Env (add to .env + Vercel):
 *   STRIPE_SECRET_KEY                  sk_test_... / sk_live_...
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY pk_test_... / pk_live_...  (used by the embedded checkout)
 *   STRIPE_WEBHOOK_SECRET              whsec_...   (from the webhook endpoint / stripe listen)
 *   STRIPE_PRICE_STRONG_GIRL  price_... (ONE-OFF £79 - the Strong Girl Project)
 *   STRIPE_PRICE_STRONG_ERA   price_... (RECURRING monthly £129 - Your Strong Era)
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_missing");

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/** The customer's current (not-cancelled) subscription, if any. */
export async function findLiveSubscription(customerId: string): Promise<Stripe.Subscription | null> {
  const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10 });
  return (
    subs.data.find((s) => ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(s.status)) ?? null
  );
}
