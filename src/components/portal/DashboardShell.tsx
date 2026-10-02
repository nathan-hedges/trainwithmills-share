"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Apple,
  CalendarDays,
  CalendarHeart,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  LayoutTemplate,
  LineChart,
  LogOut,
  type LucideIcon,
  Megaphone,
  Menu,
  MessageSquare,
  Settings,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { type Role } from "@/lib/portal/types";
import { Logo } from "@/components/site/Logo";
import { Avatar } from "@/components/shared/Placeholder";
import { NotificationsBell } from "./NotificationsBell";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { MobileTabBar } from "./MobileTabBar";

type NavItem = { label: string; href?: string; icon: LucideIcon; soon?: boolean; dot?: boolean };

/** The signed-in user, as exposed on the Auth.js session. */
export interface ShellUser {
  name?: string | null;
  email?: string | null;
  id?: string | null;
  hasAvatar?: boolean;
}

const NAV: Record<Role, NavItem[]> = {
  coach: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Invite clients", href: "/admin/invite", icon: UserPlus },
    { label: "Groups", href: "/admin/groups", icon: Users },
    { label: "Programming", href: "/admin/programming", icon: CalendarDays },
    { label: "Exercise library", href: "/admin/library", icon: Dumbbell },
    { label: "Templates", href: "/admin/templates", icon: LayoutTemplate },
    { label: "Nutrition", href: "/admin/nutrition", icon: Apple },
    { label: "Forms", href: "/admin/forms", icon: ClipboardList },
    { label: "Messages", href: "/admin/messages", icon: MessageSquare },
    { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
  // Order mirrors the mobile tab bar exactly: the four main destinations, then
  // the items that live behind "More" on a phone.
  client: [
    { label: "Today", href: "/portal", icon: LayoutDashboard },
    { label: "Progress", href: "/portal/progress", icon: LineChart },
    { label: "My Cycle", href: "/portal/cycle", icon: CalendarHeart },
    { label: "Messages", href: "/portal/messages", icon: MessageSquare },
    { label: "Nutrition", href: "/portal/nutrition", icon: Apple },
    { label: "Forms", href: "/portal/forms", icon: ClipboardList },
    { label: "Settings", href: "/portal/settings", icon: Settings },
  ],
};

function isActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/clients");
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Two-letter initials from a display name (e.g. "Millie Rolls-Hooper" -> "MR"). */
function initialsFromName(name: string, fallback: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase() || fallback;
}

export function DashboardShell({
  role,
  user,
  children,
  groupNav,
}: {
  role: Role;
  user: ShellUser;
  children: ReactNode;
  /** Set for clients who are in a Strong Girl group: shows the My Group item. */
  groupNav?: { unread: boolean } | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // For group members My Group REPLACES Messages in the main list (the group
  // chat is where they actually talk), and Messages drops down with the rest -
  // exactly what the mobile tab bar does. My Cycle always shows for clients:
  // the page itself explains that Millie sets tracking up.
  let navItems: NavItem[] = NAV[role];
  if (role === "client" && groupNav) {
    const at = NAV.client.findIndex((i) => i.href === "/portal/messages");
    navItems = [
      ...NAV.client.slice(0, at),
      { label: "My Group", href: "/portal/group", icon: Users, dot: groupNav.unread },
      { label: "Messages", href: "/portal/messages", icon: MessageSquare },
      ...NAV.client.slice(at + 1),
    ];
  }

  const displayName =
    user.name || user.email?.split("@")[0] || (role === "coach" ? "Coach" : "Client");
  const initials = initialsFromName(displayName, role === "coach" ? "C" : "CL");
  const subtitle = role === "coach" ? "Head coach" : "Client";

  return (
    <div className="min-h-dvh bg-[#f4f6fb]">
      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col border-r border-line bg-white transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <Logo />
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="text-muted hover:text-ink lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-luxe text-muted">
            {role === "coach" ? "Coaching" : "Training"}
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href ? isActive(item.href, pathname) : false;

            if (!item.href || item.soon) {
              return (
                <span
                  key={item.label}
                  className="flex cursor-not-allowed items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/35"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                    Soon
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-royal-600 text-white shadow-soft"
                    : "text-ink/70 hover:bg-royal-50 hover:text-ink",
                )}
              >
                <Icon className={cn("h-5 w-5", active ? "text-white" : "text-royal-500")} />
                {item.label}
                {item.dot && !active && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-gold-500" aria-label="New messages" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar initials={initials} userId={user.id} hasAvatar={user.hasAvatar} className="h-9 w-9 text-xs" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink">{displayName}</div>
              <div className="text-xs text-muted">{subtitle}</div>
            </div>
            <button
              type="button"
              onClick={() => signOut({ redirectTo: "/" })}
              aria-label="Sign out"
              className="text-muted transition-colors hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-[#f4f6fb]/80 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Clients navigate from the bottom bar on phones, so they get the
                logo here instead of a redundant menu button. */}
            {role === "client" ? (
              <span className="lg:hidden">
                <Logo />
              </span>
            ) : (
              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                className="grid h-11 w-11 place-items-center rounded-lg text-ink hover:bg-white lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationsBell />

            <Avatar
              initials={initials}
              userId={user.id}
              hasAvatar={user.hasAvatar}
              className="h-9 w-9 text-xs ring-2 ring-white"
            />
          </div>
        </header>

        <AnnouncementBanner />

        {/* Extra bottom padding on phones so content clears the tab bar. */}
        <main
          className={cn(
            "px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
            role === "client" && "pb-28 lg:pb-8",
          )}
        >
          {children}
        </main>
      </div>

      {role === "client" && <MobileTabBar groupNav={groupNav} />}
    </div>
  );
}
