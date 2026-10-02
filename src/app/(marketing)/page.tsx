import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { Pillars } from "@/components/home/Pillars";
import { AboutPreview } from "@/components/home/AboutPreview";
import { Process } from "@/components/home/Process";
import { Section } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { PricingCards } from "@/components/shared/PricingCards";
import { Accordion } from "@/components/ui/Accordion";
import { CtaBand } from "@/components/shared/CtaBand";
import { faqs } from "@/lib/content";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Pillars />
      <AboutPreview />
      <Process />

      {/* Pricing preview */}
      <Section className="bg-white">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <div className="flex justify-center">
              <Eyebrow>Plans &amp; services</Eyebrow>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 text-balance font-display text-4xl sm:text-5xl">
              Coaching for every starting point.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              Transparent pricing, no lock-in. Choose the level of support that fits -
              upgrade or pause whenever you need.
            </p>
          </Reveal>
        </div>
        <div className="mt-14">
          <PricingCards />
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/services"
            className="group inline-flex items-center gap-2 font-semibold text-royal-700"
          >
            Compare full plans
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <Eyebrow>Good to know</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-5 text-balance font-display text-4xl sm:text-5xl">
                Questions, answered.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 text-lg leading-relaxed text-muted">
                Still curious? Your free consult is the perfect place to ask me anything at
                all.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <Button href="/contact" variant="secondary" className="mt-7">
                Book a free consult
              </Button>
            </Reveal>
          </div>
          <Reveal>
            <Accordion items={faqs} />
          </Reveal>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
