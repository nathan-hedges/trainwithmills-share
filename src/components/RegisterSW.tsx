"use client";

import { useEffect } from "react";

/** Registers the service worker (production only - it would fight Turbopack's
 *  hot reload in dev). Gives the PWA its cached loading screen + asset cache. */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* registration failing should never break the app */
    });
  }, []);

  return null;
}
