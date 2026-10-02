import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPortalAccess, isOneOffPlan } from "@/lib/billing";
import { tiers } from "@/lib/content";
import { SubscribeCheckout } from "@/components/billing/SubscribeCheckout";

export const metadata: Metadata = { title: "Start your plan" };

/**
 * Where new clients pay. Reached right after account creation (the portal
 * gate bounces any unpaid client here), and again any time they sign in
 * before paying - including Strong Girl members re-enrolling after their
 * programme ended. Exempt/paid users are sent straight to the portal.
 */
export default async function SubscribePage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/login");
  if ((session?.user as { role?: string })?.role === "COACH") redirect("/admin");

  const me = await prisma.user.findUnique({
    where: { email },
    select: {
      firstName: true,
      plan: true,
      billingExempt: true,
      subscriptionStatus: true,
      programmePaidAt: true,
      group: { select: { startDate: true } },
    },
  });
  if (!me) redirect("/login");
  if (hasPortalAccess(me)) redirect("/portal");

  const tier = tiers.find((t) => t.name === me.plan) ?? null;
  const oneOff = isOneOffPlan(me.plan);
  const pastDue = me.subscriptionStatus === "past_due" || me.subscriptionStatus === "unpaid";
  // A Strong Girl client back here after paying once = their programme ended.
  const reEnrolling = oneOff && me.programmePaidAt != null;

  const heading = pastDue
    ? "There's a problem with your payment"
    : reEnrolling
      ? "Ready for another six weeks?"
      : `One last step, ${me.firstName || "welcome"}`;
  const sub = pastDue
    ? "Your last payment didn't go through, so your portal is paused. Update your card below and you'll be back in straight away."
    : reEnrolling
      ? "Your last programme has finished. Pay below to join the next group - I'll set your start date."
      : oneOff
        ? "Your account is ready - secure your place below and your portal unlocks immediately."
        : "Your account is ready - start your subscription below and your portal unlocks immediately.";

  return (
    <main className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <div className="text-center">
          <p className="text-sm font-medium text-royal-600">Train with Mills</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight text-ink sm:text-4xl">{heading}</h1>
          <p className="mx-auto mt-2 max-w-md text-muted">{sub}</p>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Their plan */}
          <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
            {tier ? (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Your plan</div>
                <h2 className="mt-1 font-display text-2xl text-ink">{tier.name}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-4xl text-royal-700">{tier.price}</span>
                  <span className="text-sm text-muted">
                    {tier.billing === "one-off" ? `· ${tier.cadence}` : "/ month"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted">{tier.summary}</p>
                <ul className="mt-4 space-y-2">
                  {tier.features.slice(0, 6).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-royal-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted">
                  {tier.billing === "one-off"
                    ? "One-off payment for the full 6-week programme. I'll place you in a group and confirm your start date."
                    : "Billed monthly. Cancel any time with 7 days' notice before your next billing date."}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">
                No plan is set on your account yet - message me at{" "}
                <a href="mailto:millie@trainwithmills.co.uk" className="font-medium text-royal-700 underline">
                  millie@trainwithmills.co.uk
                </a>{" "}
                and I&apos;ll sort it.
              </p>
            )}
          </div>

          {/* Embedded Stripe checkout */}
          {tier && (
            <div className="overflow-hidden rounded-3xl border border-line bg-white p-2 shadow-soft">
              <SubscribeCheckout />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
