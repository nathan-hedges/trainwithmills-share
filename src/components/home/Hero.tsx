import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { ImagePanel } from "@/components/shared/Placeholder";
import { brand } from "@/lib/content";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-royal-200/50 blur-3xl" />
        <div className="absolute left-1/4 top-40 h-72 w-72 animate-float rounded-full bg-gold-200/40 blur-3xl" />
      </div>

      <Container className="grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-2 lg:gap-10 lg:py-28">
        <div>
          <Reveal>
            <Eyebrow>1-on-1 coaching for women</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 text-balance font-display text-5xl leading-[1.03] tracking-tight sm:text-6xl lg:text-[4.5rem]">
              Build a body you{" "}
              <span className="text-gradient-royal italic">trust</span> - and the
              habits to keep it.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted">
              Achieve sustainable results with coaching that adapts to your lifestyle, not
              the other way round. Your training and nutrition guidance are built around
              your body, goals and daily life - giving you a clear plan and expert
              accountability every step of the way.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href={brand.primaryCta.href} size="lg">
                {brand.primaryCta.label}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href={brand.secondaryCta.href} size="lg" variant="secondary">
                {brand.secondaryCta.label}
              </Button>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="relative">
          <ImagePanel
            className="aspect-[4/5] w-full"
            src="/images/millie-hero.jpg"
            alt="Millie competing on the track"
            priority
          />
        </Reveal>
      </Container>
    </section>
  );
}
