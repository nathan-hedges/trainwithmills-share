"use client";

import { AlertTriangle, Cake, Compass, HeartPulse } from "lucide-react";
import { Card } from "../primitives";
import { ageFrom } from "@/lib/portal/types";

export interface IntakeFields {
  dateOfBirth?: string | null;
  lifestyle?: string | null;
  injuries?: string | null;
  goal?: string | null;
}

/**
 * What Millie learned on the onboarding call, shown on the client's Overview.
 * Renders nothing at all until there's something to show.
 */
export function ClientIntakeCard({ client }: { client: IntakeFields }) {
  const age = ageFrom(client.dateOfBirth);
  const hasAny = age != null || client.lifestyle || client.injuries || client.goal;
  if (!hasAny) return null;

  return (
    <Card className="p-5">
      <h3 className="font-display text-lg">About her</h3>

      <dl className="mt-3 space-y-3 text-sm">
        {age != null && (
          <div className="flex items-start gap-2.5">
            <Cake className="mt-0.5 h-4 w-4 shrink-0 text-royal-500" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Age</dt>
              <dd className="text-ink">{age}</dd>
            </div>
          </div>
        )}

        {client.goal && (
          <div className="flex items-start gap-2.5">
            <Compass className="mt-0.5 h-4 w-4 shrink-0 text-royal-500" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Goal</dt>
              <dd className="text-ink">{client.goal}</dd>
            </div>
          </div>
        )}

        {client.lifestyle && (
          <div className="flex items-start gap-2.5">
            <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-royal-500" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Lifestyle</dt>
              <dd className="whitespace-pre-line text-ink">{client.lifestyle}</dd>
            </div>
          </div>
        )}

        {client.injuries && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Injuries / limitations
              </dt>
              <dd className="whitespace-pre-line text-amber-900">{client.injuries}</dd>
            </div>
          </div>
        )}
      </dl>

      <p className="mt-3 text-xs text-muted">From your onboarding call - edit any of it in Manage.</p>
    </Card>
  );
}

/** The one-line injury warning shown while programming her sessions. */
export function InjuryBanner({ injuries }: { injuries?: string | null }) {
  if (!injuries) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <span>
        <span className="font-semibold">Watch out:</span> {injuries}
      </span>
    </div>
  );
}
