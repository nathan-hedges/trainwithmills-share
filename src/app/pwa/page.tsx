"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, MoreVertical, Share, Smartphone, SquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";

type Platform = "ios" | "android";

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}

const iosSteps: Step[] = [
  {
    icon: Smartphone,
    title: "Open the site in Safari",
    body: (
      <>
        Go to <strong>trainwithmills.co.uk</strong> in <strong>Safari</strong>. On iPhone &amp; iPad this only works in
        Safari - not Chrome.
      </>
    ),
  },
  {
    icon: Share,
    title: "Tap the Share button",
    body: <>It&apos;s the square with an arrow pointing up, in the toolbar at the bottom (or top) of the screen.</>,
  },
  {
    icon: SquarePlus,
    title: "Tap “Add to Home Screen”",
    body: <>Scroll down the share menu until you see it, then tap it.</>,
  },
  {
    icon: Check,
    title: "Tap “Add”",
    body: <>Confirm with <strong>Add</strong> in the top-right. The Mills icon drops onto your home screen.</>,
  },
];

const androidSteps: Step[] = [
  {
    icon: Smartphone,
    title: "Open the site in Chrome",
    body: (
      <>
        Go to <strong>trainwithmills.co.uk</strong> in <strong>Chrome</strong>.
      </>
    ),
  },
  {
    icon: MoreVertical,
    title: "Open the menu",
    body: <>Tap the <strong>⋮</strong> menu in the top-right corner.</>,
  },
  {
    icon: SquarePlus,
    title: "Tap “Add to Home screen”",
    body: <>You may see it called <strong>Install app</strong> instead - either is fine.</>,
  },
  {
    icon: Check,
    title: "Tap “Add” / “Install”",
    body: <>Confirm, and the Mills icon appears with your other apps.</>,
  },
];

export default function PwaPage() {
  const [platform, setPlatform] = useState<Platform>("ios");
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const android = /android/i.test(ua);
    setPlatform(android && !ios ? "android" : "ios");
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
    );
  }, []);

  const steps = platform === "ios" ? iosSteps : androidSteps;

  return (
    <main className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-xl px-5 py-8 sm:py-12">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to your portal
        </Link>

        {/* Hero */}
        <div className="mt-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="Train with Mills app icon" className="h-20 w-20 rounded-[1.25rem] shadow-elevated" />
          <h1 className="mt-4 font-display text-3xl text-ink">Add the app to your phone</h1>
          <p className="mt-2 max-w-md text-muted">
            Install Train with Mills on your home screen so it opens full-screen, making it more convenient.
          </p>
        </div>

        {standalone && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <Check className="h-5 w-5 shrink-0 text-emerald-600" />
            You&apos;re already running the installed app - you&apos;re all set.
          </div>
        )}

        {/* Platform toggle */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-full border border-line bg-white p-1">
            {(["ios", "android"] as Platform[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                  platform === p ? "bg-royal-600 text-white" : "text-muted hover:text-ink",
                )}
              >
                {p === "ios" ? "iPhone / iPad" : "Android"}
              </button>
            ))}
          </div>
        </div>

        {/* Steps */}
        <ol className="mt-6 space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft">
              <div className="flex flex-col items-center">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-royal-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                {i < steps.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
              </div>
              <div className="min-w-0 flex-1 pb-0.5">
                <div className="flex items-center gap-2">
                  <step.icon className="h-4 w-4 shrink-0 text-royal-600" />
                  <h3 className="font-semibold text-ink">{step.title}</h3>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {platform === "ios" && (
          <p className="mt-4 rounded-xl bg-gold-100/50 px-4 py-3 text-xs leading-relaxed text-ink">
            <strong>Tip:</strong> if you don&apos;t see “Add to Home Screen”, make sure you opened the site in Safari
            (the share menu in other browsers won&apos;t show it on iPhone).
          </p>
        )}

        <p className="mt-8 text-center text-sm text-muted">
          Once it&apos;s on your home screen, open it from there - it stays signed in.
        </p>
      </div>
    </main>
  );
}
