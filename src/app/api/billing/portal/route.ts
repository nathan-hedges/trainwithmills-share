import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, stripeConfigured } from "@/lib/stripe";

// POST /api/billing/portal - open Stripe's billing portal for the signed-in
// client (update card, see invoices, cancel at period end). Returns { url }.
export async function POST() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Unauthorized", { status: 401 });
  if (!stripeConfigured()) return new Response("Payments aren't configured yet.", { status: 503 });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) return new Response("No billing account yet.", { status: 400 });

  const appUrl = process.env.APP_URL ?? "https://trainwithmills.co.uk";
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/portal/settings`,
  });

  return Response.json({ url: session.url });
}
