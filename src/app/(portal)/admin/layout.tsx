import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/portal/DashboardShell";

export const metadata: Metadata = { title: "Coach Dashboard" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const me = email
    ? await prisma.user.findUnique({ where: { email }, select: { id: true, avatarKey: true } })
    : null;

  return (
    <DashboardShell
      role="coach"
      user={{
        name: session?.user?.name,
        email: session?.user?.email,
        id: me?.id,
        hasAvatar: Boolean(me?.avatarKey),
      }}
    >
      {children}
    </DashboardShell>
  );
}
