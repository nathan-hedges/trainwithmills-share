import { tiers, type Tier } from "./content";

/**
 * Billing rules in one place. Two worlds now:
 *
 *  - Your Strong Era: a monthly Stripe subscription. Access while the
 *    subscription is in good standing (locks on the first failed payment).
 *  - Strong Girl Project: a one-off payment for a 6-week programme. Access
 *    from the moment they pay; the clock starts when Millie places them in a
 *    group, and access ends after day 42 (day 1 = the group's start date).
 *    Paid-but-unplaced clients get UNPLACED_GRACE_DAYS while they wait.
 */

export const PROGRAMME_DAYS = 42;

/**
 * How long someone who has paid but hasn't been placed in a group keeps access.
 * Generous on purpose (placing takes a few days), but finite: without it, a
 * client whose group was deleted would keep access indefinitely.
 */
export const UNPLACED_GRACE_DAYS = 60;

/** The tier config for a client's plan name (exact match), or null. */
export function tierForPlan(plan: string | null | undefined): Tier | null {
  if (!plan) return null;
  return tiers.find((t) => t.name === plan) ?? null;
}

/** True when the plan is the one-off 6-week programme. */
export function isOneOffPlan(plan: string | null | undefined): boolean {
  return tierForPlan(plan)?.billing === "one-off";
}

/** Day 42 - the LAST day a group member can train (day 1 = startDate). */
export function programmeLastDay(startDate: Date): Date {
  const d = new Date(startDate);
  d.setUTCDate(d.getUTCDate() + PROGRAMME_DAYS - 1);
  return d;
}

/** True once the whole of day 42 is over (UTC days, same as workout dates). */
export function programmeEnded(startDate: Date, now = new Date()): boolean {
  const day = (d: Date) => d.toISOString().split("T")[0];
  return day(now) > day(programmeLastDay(startDate));
}

export interface AccessFields {
  billingExempt: boolean;
  subscriptionStatus: string | null;
  programmePaidAt: Date | null;
  group: { startDate: Date } | null;
}

/** Days since a date, in whole UTC days. */
function daysSince(from: Date, now = new Date()): number {
  const day = (d: Date) => new Date(`${d.toISOString().split("T")[0]}T00:00:00Z`).getTime();
  return Math.round((day(now) - day(from)) / 86_400_000);
}

/**
 * Portal access:
 *  - exempt (grandfathered/comped), or
 *  - a subscription in good standing, or
 *  - a paid programme that hasn't ended (paid but not yet in a group counts -
 *    they can set up and look around while waiting for their start date).
 */
export function hasPortalAccess(user: AccessFields): boolean {
  if (user.billingExempt) return true;
  if (user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing") return true;
  if (user.programmePaidAt) {
    // Placed: access for the six weeks of their group.
    if (user.group) return !programmeEnded(user.group.startDate);
    // Paid but not placed yet - access while they wait, not forever.
    return daysSince(user.programmePaidAt) <= UNPLACED_GRACE_DAYS;
  }
  return false;
}

/** Everything checkout needs to know for a plan: the price id + Stripe mode. */
export function planBilling(
  plan: string | null | undefined,
): { priceId: string | null; mode: "payment" | "subscription" } | null {
  const tier = tierForPlan(plan);
  if (!tier) return null;
  return tier.billing === "one-off"
    ? { priceId: process.env.STRIPE_PRICE_STRONG_GIRL ?? null, mode: "payment" }
    : { priceId: process.env.STRIPE_PRICE_STRONG_ERA ?? null, mode: "subscription" };
}
