import { tiers } from "@/lib/content";
import type { Tier } from "./config";

// The nutrition tier is derived from the client's plan (the single source of
// truth, set at invite + in the Manage modal). Unknown / no plan → null, which
// the UI treats as "no active nutrition plan".
export function tierFromPlan(plan: string | null | undefined): Tier | null {
  if (!plan) return null;
  return tiers.find((t) => t.name === plan)?.nutritionTier ?? null;
}

/**
 * Form-check videos (form analysis). Both current plans include form reviews,
 * so any recognised plan qualifies. No plan → no video.
 */
export function canSendFormVideos(plan: string | null | undefined): boolean {
  const tier = tierFromPlan(plan);
  return tier === "beginner" || tier === "performance";
}
