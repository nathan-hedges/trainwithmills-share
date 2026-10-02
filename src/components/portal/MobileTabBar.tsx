"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Apple,
  CalendarHeart,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  LogOut,
  type LucideIcon,
  MessageSquare,
  MoreHorizontal,
  Settings,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = { label: string; href: string; icon: LucideIcon; dot?: boolean };

/**
 * Thumb-reachable navigation for clients on phones (the sidebar drawer stays
 * for the coach and for large screens). Five slots: four destinations plus a
 * "More" sheet holding everything else - in the same order as the sidebar.
 */
export function MobileTabBar({ groupNav }: { groupNav?: { unread: boolean } | null }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Group members live in the group chat, so it takes the fourth slot and
  // 1-1 Messages moves into More. Everyone else keeps Messages up front.
  const tabs: Tab[] = [
    { label: "Today", href: "/portal", icon: LayoutDashboard },
    { label: "Progress", href: "/portal/progress", icon: LineChart },
    { label: "Cycle", href: "/portal/cycle", icon: CalendarHeart },
    groupNav
      ? { label: "My Group", href: "/portal/group", icon: Users, dot: groupNav.unread }
      : { label: "Messages", href: "/portal/messages", icon: MessageSquare },
  ];

  const moreItems: Tab[] = [
    ...(groupNav ? [{ label: "Messages", href: "/portal/messages", icon: MessageSquare }] : []),
    { label: "Nutrition", href: "/portal/nutrition", icon: Apple },
    { label: "Forms", href: "/portal/forms", icon: ClipboardList },
    { label: "Settings", href: "/portal/settings", icon: Settings },
  ];

  const isActive = (href: string) =>
    href === "/portal" ? pathname === "/portal" : pathname === href || pathname.startsWith(`${href}/`);

  // Highlight "More" while the user is on one of the pages it contains.
  const moreActive = moreItems.some((i) => isActive(i.href));
  const moreDot = moreItems.some((i) => i.dot);

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden
        />
      )}

      {/* More sheet */}
      {moreOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="More"
        >
          <div className="flex items-center justify-between px-5 py-4">
            <span className="font-display text-lg text-ink">More</span>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              aria-label="Close"
              className="grid h-11 w-11 place-items-center rounded-full text-muted transition-colors hover:bg-paper hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="px-3 pb-3">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex min-h-[3rem] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-royal-600 text-white" : "text-ink/80 hover:bg-royal-50",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active ? "text-white" : "text-royal-500")} />
                  {item.label}
                  {item.dot && !active && <span className="ml-auto h-2 w-2 rounded-full bg-gold-500" />}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => signOut({ redirectTo: "/" })}
              className="flex min-h-[3rem] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-royal-50"
            >
              <LogOut className="h-5 w-5 text-royal-500" />
              Sign out
            </button>
          </nav>
        </div>
      )}

      {/* The bar itself */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[3.5rem] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
                    active ? "text-royal-700" : "text-muted",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "text-royal-600")} />
                  {tab.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More"
              aria-expanded={moreOpen}
              className={cn(
                "relative flex min-h-[3.5rem] w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
                moreActive ? "text-royal-700" : "text-muted",
              )}
            >
              <MoreHorizontal className={cn("h-5 w-5", moreActive && "text-royal-600")} />
              More
              {moreDot && <span className="absolute right-1/2 top-2 h-2 w-2 translate-x-3.5 rounded-full bg-gold-500" />}
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
