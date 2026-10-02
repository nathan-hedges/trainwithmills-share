import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, stripeConfigured, findLiveSubscription } from "@/lib/stripe";
import { isOneOffPlan, programmeLastDay, programmeEnded } from "@/lib/billing";
import { brandedEmail, sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

const fmtDate = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

// GET /api/clients/[id]/billing - live snapshot for the Manage modal.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      billingExempt: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      plan: true,
      programmePaidAt: true,
      group: { select: { name: true, startDate: true } },
    },
  });
  if (!user) return new Response("Not found", { status: 404 });

  const snapshot = {
    exempt: user.billingExempt,
    hasSubscription: false,
    status: user.subscriptionStatus,
    amount: null as number | null, // pence
    nextBillingDate: null as string | null,
    endsOn: null as string | null, // set when a cancellation is scheduled
    // One-off Strong Girl Project state (null when they're not on that plan).
    programme: null as null | {
      paid: boolean;
      paidOn: string | null;
      groupName: string | null;
      startsOn: string | null;
      lastDay: string | null;
      ended: boolean;
    },
  };

  if (isOneOffPlan(user.plan)) {
    const fmtD = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    snapshot.programme = {
      paid: user.programmePaidAt != null,
      paidOn: user.programmePaidAt ? fmtD(user.programmePaidAt) : null,
      groupName: user.group?.name ?? null,
      startsOn: user.group ? fmtD(user.group.startDate) : null,
      lastDay: user.group ? fmtD(programmeLastDay(user.group.startDate)) : null,
      ended: user.group ? programmeEnded(user.group.startDate) : false,
    };
    return Response.json(snapshot); // no subscription to look up for this plan
  }

  if (!user.billingExempt && stripeConfigured() && user.stripeCustomerId) {
    try {
      const sub = await findLiveSubscription(user.stripeCustomerId);
      const item = sub?.items.data[0];
      if (sub && item) {
        snapshot.hasSubscription = true;
        snapshot.status = sub.status;
        snapshot.amount = item.price.unit_amount ?? null;
        const periodEnd = fmtDate(item.current_period_end);
        if (sub.cancel_at_period_end) snapshot.endsOn = periodEnd;
        else snapshot.nextBillingDate = periodEnd;
      }
    } catch {
      /* snapshot is best-effort - the modal shows what it can */
    }
  }

  return Response.json(snapshot);
}

// POST /api/clients/[id]/billing - coach billing actions.
// Body: { action: "cancel" | "reactivate" | "shutdown" }.
//  cancel     → billed clients keep access until the paid period ends (Stripe
//               cancels then; the webhook locks the portal). Unbilled/exempt
//               clients are ended immediately.
//  reactivate → un-schedules a pending cancellation / unpauses.
//  shutdown   → immediate, hard cut-off (policy breach): Stripe subscription
//               cancelled NOW, access locked now.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const { action } = await req.json().catch(() => ({}));
  if (!["cancel", "reactivate", "shutdown"].includes(action)) {
    return new Response("action must be cancel, reactivate or shutdown", { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true, firstName: true, billingExempt: true, stripeCustomerId: true, plan: true },
  });
  if (!user) return new Response("Not found", { status: 404 });

  const first = user.firstName || "there";
  const sub =
    stripeConfigured() && user.stripeCustomerId ? await findLiveSubscription(user.stripeCustomerId).catch(() => null) : null;

  try {
    if (action === "cancel") {
      if (sub) {
        // Paid client: let the month they've paid for run out.
        if (!sub.cancel_at_period_end) await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
        const endsOn = fmtDate(sub.items.data[0].current_period_end);
        await createNotification(id, "alert", `Your coaching plan ends on ${endsOn}`, "/portal/settings");
        await sendEmail({
          to: user.email,
          subject: "Your Train with Mills subscription has been cancelled",
          html: brandedEmail({
            heading: `Your coaching ends on ${endsOn}`,
            intro: `Hi ${first}, your subscription has been cancelled as arranged. You keep full access to your portal and plan until ${endsOn} - no further payments will be taken.`,
            footerNote: "Change of heart? Just reply to this email and we'll pick things straight back up.",
          }),
        });
      } else {
        // No subscription (exempt, never paid, or a one-off programme): end it
        // now. Clearing programmePaidAt/groupId also closes the Strong Girl
        // access branch - without this a paid programme member would stay in.
        await prisma.user.update({
          where: { id },
          data: { plan: null, status: "paused", programmePaidAt: null, groupId: null },
        });
        await sendEmail({
          to: user.email,
          subject: "Your Train with Mills coaching has ended",
          html: brandedEmail({
            heading: "Your coaching has ended",
            intro: `Hi ${first}, your coaching plan with Train with Mills has now ended. Thank you for training with us - you're always welcome back.`,
          }),
        });
      }
    }

    if (action === "reactivate") {
      if (sub?.cancel_at_period_end) await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
      await prisma.user.update({ where: { id }, data: { status: "active" } });
      await createNotification(id, "summary", "Welcome back - your plan is active again", "/portal");
      await sendEmail({
        to: user.email,
        subject: "Welcome back to Train with Mills",
        html: brandedEmail({
          heading: "Your plan is active again",
          intro: `Hi ${first}, great news - your coaching subscription continues as before. See you in the portal!`,
          button: { label: "Open your portal", url: `${process.env.APP_URL ?? "https://trainwithmills.co.uk"}/portal` },
        }),
      });
    }

    if (action === "shutdown") {
      if (sub) await stripe.subscriptions.cancel(sub.id); // immediate, no period grace
      await prisma.user.update({
        where: { id },
        data: {
          plan: null,
          status: "paused",
          billingExempt: false,
          subscriptionStatus: "canceled",
          programmePaidAt: null, // also closes the Strong Girl access branch
          groupId: null,
        },
      });
      await sendEmail({
        to: user.email,
        subject: "Your Train with Mills access has ended",
        html: brandedEmail({
          heading: "Your access has ended",
          intro: `Hi ${first}, your Train with Mills subscription and portal access have been ended with immediate effect. If you believe this is a mistake, contact millie@trainwithmills.co.uk.`,
        }),
      });
    }
  } catch (err) {
    console.error(`Billing action "${action}" failed for client`, id, err);
    return new Response("The Stripe update failed - check the Stripe dashboard.", { status: 502 });
  }

  const updated = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, firstName: true, lastName: true, email: true, role: true,
      plan: true, goal: true, program: true, status: true, billingExempt: true, subscriptionStatus: true,
    },
  });
  return Response.json(updated);
}
