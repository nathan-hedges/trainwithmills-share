import { Section } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { brand, processSteps } from "@/lib/content";

export function Process() {
  return (
    <Section className="bg-white">
      <div className="grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="lg:sticky lg:top-28">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 text-balance font-display text-4xl sm:text-5xl">
              Simple to start. Built to last.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              From the first call to lasting results, here is exactly how we will work
              together - no overwhelm, no fads.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <Button href={brand.primaryCta.href} size="lg" className="mt-8">
              {brand.primaryCta.label}
            </Button>
          </Reveal>
        </div>

        <Stagger className="space-y-4">
          {processSteps.map((s) => (
            <StaggerItem key={s.n}>
              <div className="flex gap-5 rounded-3xl border border-line bg-paper p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft sm:gap-7 sm:p-8">
                <span className="font-display text-4xl text-royal-200">{s.n}</span>
                <div>
                  <h3 className="font-display text-xl">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{s.blurb}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
