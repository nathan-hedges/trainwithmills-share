import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPortalAccess } from "@/lib/billing";
import { DashboardShell } from "@/components/portal/DashboardShell";
import { PwaPrompt } from "@/components/portal/PwaPrompt";

export const metadata: Metadata = { title: "Client Portal" };

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // NOTE: the "send a coach to /admin" guard lives in portal/page.tsx, not here.
  // Layouts don't receive searchParams, so doing it here also bounced the coach
  // out of "View as client" (/portal?preview=<id>), which is a coach-only view.

  // Billing gate: clients without an active subscription, a live programme,
  // or an exemption go to /subscribe instead of the portal.
  const email = session?.user?.email?.toLowerCase();
  let groupNav: { unread: boolean } | null = null;
  let shellUser: { id?: string; hasAvatar?: boolean } = {};
  if (email) {
    const me = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        billingExempt: true,
        subscriptionStatus: true,
        programmePaidAt: true,
        groupId: true,
        groupChatSeenAt: true,
        avatarKey: true,
        group: { select: { startDate: true } },
      },
    });
    if (me?.role === "CLIENT" && !hasPortalAccess(me)) redirect("/subscribe");
    if (me) shellUser = { id: me.id, hasAvatar: Boolean(me.avatarKey) };

    // Group members get the My Group nav item, with an unread dot when someone
    // else has posted since they last opened the chat.
    if (me?.role === "CLIENT" && me.groupId) {
      const latest = await prisma.groupMessage.findFirst({
        where: { groupId: me.groupId, senderId: { not: me.id } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      const unread = Boolean(latest && (!me.groupChatSeenAt || latest.createdAt > me.groupChatSeenAt));
      groupNav = { unread };
    }
  }

  return (
    <DashboardShell
      role="client"
      user={{ name: session?.user?.name, email: session?.user?.email, ...shellUser }}
      groupNav={groupNav}
    >
      {children}
      <PwaPrompt />
    </DashboardShell>
  );
}
