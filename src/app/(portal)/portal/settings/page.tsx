import Link from "next/link";
import { CreditCard, Smartphone } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, PageHeading } from "@/components/portal/primitives";
import { SettingsPanel } from "@/components/portal/SettingsPanel";
import { ManageBillingButton } from "@/components/billing/ManageBillingButton";

export default async function ClientSettingsPage() {
  const email = (await auth())?.user?.email?.toLowerCase();
  const me = email
    ? await prisma.user.findUnique({
        where: { email },
        select: {
          id: true, avatarKey: true,
          firstName: true, lastName: true, email: true, plan: true,
          stripeCustomerId: true, billingExempt: true,
          notifyMessages: true, notifySummary: true, notifyReminders: true, notifyForms: true,
        },
      })
    : null;

  const showBilling = !!me?.stripeCustomerId && !me?.billingExempt;

  return (
    <div className="space-y-6">
      <PageHeading title="Settings" subtitle="Manage your profile and preferences." />

      <Card className="flex items-center justify-between gap-4 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-royal-50 text-royal-600">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="font-medium text-ink">Install the app</div>
            <p className="text-sm text-muted">Add Train with Mills to your phone&apos;s home screen.</p>
          </div>
        </div>
        <Link
          href="/pwa"
          className="shrink-0 rounded-xl bg-royal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-royal-700"
        >
          How to
        </Link>
      </Card>

      {showBilling && (
        <Card className="flex items-center justify-between gap-4 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-royal-50 text-royal-600">
              <CreditCard className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="font-medium text-ink">Your subscription</div>
              <p className="text-sm text-muted">
                {me?.plan ? `${me.plan} - ` : ""}update your card, see invoices or cancel.
              </p>
            </div>
          </div>
          <ManageBillingButton />
        </Card>
      )}

      <SettingsPanel
        role="client"
        firstName={me?.firstName ?? ""}
        lastName={me?.lastName ?? ""}
        email={me?.email ?? ""}
        notifyMessages={me?.notifyMessages ?? true}
        notifySummary={me?.notifySummary ?? true}
        notifyReminders={me?.notifyReminders ?? true}
        notifyForms={me?.notifyForms ?? true}
        userId={me?.id}
        hasAvatar={Boolean(me?.avatarKey)}
      />
    </div>
  );
}