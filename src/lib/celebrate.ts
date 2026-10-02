"use client";

import confetti from "canvas-confetti";

const BRAND = ["#2f43d8", "#5a6cf0", "#e3b34c", "#f0d48a", "#ffffff"];

/**
 * Fire the completion celebration. `big` (PB sessions) = a multi-burst volley;
 * otherwise a single tasteful pop. No-ops when the user prefers reduced motion.
 */
export function celebrate(big: boolean) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const base = { colors: BRAND, disableForReducedMotion: true, ticks: 220 };

  confetti({ ...base, particleCount: big ? 140 : 70, spread: 75, origin: { y: 0.65 } });

  if (big) {
    setTimeout(() => confetti({ ...base, particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } }), 250);
    setTimeout(() => confetti({ ...base, particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } }), 400);
    setTimeout(() => confetti({ ...base, particleCount: 90, spread: 100, scalar: 0.9, origin: { y: 0.4 } }), 650);
  }
}
