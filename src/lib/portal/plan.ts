export type PlanInfo = { rank: number; label: string; tone: string };

/**
 * Support priority derived from a client's plan, matching the plans' messaging
 * perks (Your Strong Era 1-1s get priority replies; Strong Girl Project members
 * are supported as a group). Lower rank = higher priority. Used for the message
 * inbox and the dashboard ordering.
 */
export function planPriority(plan?: string | null): PlanInfo {
  const p = (plan ?? "").toLowerCase();
  if (p.includes("strong era")) return { rank: 0, label: "Priority", tone: "gold" };
  if (p.includes("strong girl")) return { rank: 1, label: "Group", tone: "royal" };
  return { rank: 2, label: "Standard", tone: "neutral" };
}

/** Compact plan label - strips a trailing "Plan"/"Programme" word if present. */
export function shortPlan(plan?: string | null): string {
  return (plan ?? "").replace(/\s*plan$/i, "").trim();
}
