import { Check } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { tiers } from "@/lib/content";

export function PricingCards() {
  return (
    <Stagger className="mx-auto grid w-full max-w-4xl items-stretch gap-6 lg:grid-cols-2">
      {tiers.map((tier) => (
        <StaggerItem key={tier.name} className="h-full">
          <div
            className={cn(
              "relative flex h-full flex-col rounded-3xl border p-8 transition-all duration-300",
              tier.featured
                ? "border-royal-700 text-white shadow-elevated lg:-translate-y-3"
                : "border-line bg-white text-ink shadow-soft hover:-translate-y-1.5 hover:shadow-elevated",
            )}
            style={
              tier.featured
                ? {
                    backgroundImage:
                      "radial-gradient(130% 130% at 50% 0%, #2f43d8 0%, #1f2c6e 55%, #141942 100%)",
                  }
                : undefined
            }
          >
            {tier.note && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold-500 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-royal-950">
                {tier.note}
              </span>
            )}

            <h3 className="font-display text-2xl">{tier.name}</h3>
            <p className={cn("mt-2 text-sm", tier.featured ? "text-white/60" : "text-muted")}>
              {tier.summary}
            </p>

            <div className="mt-6 flex items-end gap-1.5">
              <span className="font-display text-4xl tracking-tight">{tier.price}</span>
              <span className={cn("pb-1 text-sm", tier.featured ? "text-white/55" : "text-muted")}>
                {tier.cadence.startsWith("per ") ? `/ ${tier.cadence.slice(4)}` : `· ${tier.cadence}`}
              </span>
            </div>

            <ul className="mt-7 space-y-3 text-sm">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      tier.featured ? "text-gold-400" : "text-royal-600",
                    )}
                  />
                  <span className={tier.featured ? "text-white/80" : "text-ink/80"}>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-1 items-end pt-2">
              <Button
                href={tier.cta.href}
                variant={tier.featured ? "gold" : "secondary"}
                className="w-full"
              >
                {tier.cta.label}
              </Button>
            </div>
          </div>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
