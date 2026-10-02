import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeading } from "@/components/portal/primitives";
import { SettingsPanel } from "@/components/portal/SettingsPanel";
import { SpotifySetting } from "@/components/portal/admin/SpotifySetting";
import { CycleGuidanceSetting } from "@/components/portal/admin/CycleGuidanceSetting";

export default async function AdminSettingsPage() {
  const email = (await auth())?.user?.email?.toLowerCase();
  const me = email
    ? await prisma.user.findUnique({
        where: { email },
        select: {
          id: true, avatarKey: true,
          firstName: true, lastName: true, email: true,
          notifyMessages: true, notifySummary: true, notifyReminders: true, notifyForms: true,
        },
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeading title="Settings" subtitle="Manage your coach profile and preferences." />
      <SettingsPanel
        role="coach"
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
      <SpotifySetting />
      <CycleGuidanceSetting />
    </div>
  );
}