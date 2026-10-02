"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// When the installed PWA is launched, iOS opens whatever page was showing when
// it was added (often /pwa or the marketing home) rather than the manifest's
// start_url. This bounces such a launch into the portal so the app always opens
// in-app. Coaches then get routed on to /admin by the /portal layout.
//
// Fires at most once per launch (sessionStorage) so navigating to /pwa from
// inside the app later doesn't get hijacked.
export function StandaloneRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;

    try {
      if (sessionStorage.getItem("twm-launched")) return;
      sessionStorage.setItem("twm-launched", "1");
    } catch {
      return;
    }

    const inApp = pathname.startsWith("/portal") || pathname.startsWith("/admin");
    if (!inApp && pathname !== "/login") router.replace("/portal");
  }, [pathname, router]);

  return null;
}
