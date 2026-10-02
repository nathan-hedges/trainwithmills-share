"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const SEEN_KEY = "twm-pwa-prompt-seen";

/**
 * First-time nudge to install the app to the home screen. Shows once per device
 * (localStorage), only on mobile, and never when already running as the
 * installed PWA. Dismissing or acting marks it seen.
 */
export function PwaPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isMobile = /android|iphone|ipad|ipod/i.test(ua);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!isMobile || isStandalone) return;
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setShow(true), 1200); // let the page settle first
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative z-10 w-full max-w-sm rounded-t-3xl border border-line bg-white p-6 shadow-elevated sm:rounded-3xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 text-muted transition-colors hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-16 w-16 rounded-2xl shadow-soft" />
          <h2 className="mt-3 font-display text-xl text-ink">Add Mills to your home screen</h2>
          <p className="mt-1.5 text-sm text-muted">
            Get one-tap access to your training - it opens full-screen, just like an app.
          </p>
          <div className="mt-5 flex w-full flex-col gap-2">
            <Link
              href="/pwa"
              onClick={dismiss}
              className="w-full rounded-xl bg-royal-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-royal-700"
            >
              Show me how
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="w-full rounded-xl px-4 py-2.5 text-center text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
