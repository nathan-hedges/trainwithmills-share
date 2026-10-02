import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, stripeConfigured, findLiveSubscription } from "@/lib/stripe";
import { planBilling } from "@/lib/billing";
import { createNotification } from "@/lib/notifications";
import { brandedEmail, sendEmail } from "@/lib/email";

const ALLOWED = [
  "firstName", "lastName", "goal", "program", "plan", "status", "billingExempt",
  "dateOfBirth", "lifestyle", "injuries",
];

const safeFields = {
  id: true, firstName: true, lastName: true, email: true,
  role: true, plan: true, goal: true, program: true, status: true,
  billingExempt: true, subscriptionStatus: true,
  dateOfBirth: true, lifestyle: true, injuries: true,
} as const;

export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as {role?: string})?.role !== "COACH") return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const c = await prisma.user.findUnique({
    where: { id },
    select: { ...safeFields, createdAt: true },
  });
  return c ? Response.json(c) : new Response("Not found", { status: 404 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const coachRole = (session?.user as { role?: string })?.role;
  if (coachRole !== "COACH") return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const data = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)));
  if ("billingExempt" in data) data.billingExempt = Boolean(data.billingExempt);
  // A date input sends "YYYY-MM-DD" (or "" to clear it).
  if ("dateOfBirth" in data) {
    const raw = data.dateOfBirth;
    data.dateOfBirth = typeof raw === "string" && raw ? new Date(`${raw}T00:00:00Z`) : null;
  }
  for (const key of ["lifestyle", "injuries"] as const) {
    if (key in data) data[key] = typeof data[key] === "string" && data[key] ? data[key] : null;
  }

  // Snapshot before the update so we can tell what actually changed.
  const before = await prisma.user.findUnique({
    where: { id },
    select: { plan: true, status: true, stripeCustomerId: true, firstName: true, lastName: true },
  });
  if (!before) return new Response("Not found", { status: 404 });

  const updated = await prisma.user.update({ where: { id }, data, select: safeFields });

  // ── Plan change → keep Stripe in step + tell the client (best-effort) ──
  // (Cancel / reactivate / shutdown live in the dedicated /billing endpoint.)
  const planChanged = "plan" in data && typeof data.plan === "string" && data.plan !== before.plan;
  if (planChanged) {
    const client = await prisma.user.findUnique({ where: { id }, select: { email: true, firstName: true } });
    const billing = planBilling(String(data.plan));
    try {
      let hadSub = false;
      if (stripeConfigured() && before.stripeCustomerId) {
        const sub = await findLiveSubscription(before.stripeCustomerId);
        hadSub = Boolean(sub);
        // Only a subscription→subscription move swaps the Stripe price. Moving
        // to the one-off programme never touches an existing subscription -
        // Millie cancels it via the billing actions if that's what she means.
        if (sub && billing?.mode === "subscription" && billing.priceId && sub.items.data[0]) {
          await stripe.subscriptions.update(sub.id, {
            items: [{ id: sub.items.data[0].id, price: billing.priceId }],
            proration_behavior: "none", // new price simply applies from the next invoice
            cancel_at_period_end: false,
          });
        }
      }
      if (client) {
        const paymentLine =
          billing?.mode === "payment"
            ? "It's a one-off payment for the 6-week programme - next time you sign in, your portal will take you through securing your place."
            : hadSub
              ? "Your payment amount changes from your next billing date, so nothing extra is charged this month."
              : "Next time you sign in, your portal will take you through starting your subscription.";
        await createNotification(id, "summary", `Your plan is now ${data.plan}`, "/portal");
        await sendEmail({
          to: client.email,
          subject: "Your Train with Mills plan has changed",
          html: brandedEmail({
            heading: `You're now on the ${data.plan}`,
            intro: `Hi ${client.firstName || "there"}, I&rsquo;ve moved you to the ${data.plan}. Your portal features have updated straight away. ${paymentLine}`,
            button: { label: "See what's included", url: `${process.env.APP_URL ?? "https://trainwithmills.co.uk"}/portal` },
          }),
        });
      }
    } catch (err) {
      // Never block the coach's save on a billing hiccup - but do tell her.
      console.error("Stripe plan sync failed for client", id, err);
      const coach = await prisma.user.findFirst({ where: { role: "COACH" }, select: { id: true } });
      const name = [before.firstName, before.lastName].filter(Boolean).join(" ") || "this client";
      if (coach) {
        await createNotification(
          coach.id,
          "alert",
          `Couldn't update Stripe billing for ${name} - please check the Stripe dashboard`,
          `/admin/clients/${id}`,
        );
      }
    }
  }

  return Response.json(updated);
}
