import type { Metadata } from "next";
import { Check, Dumbbell, LayoutDashboard, RefreshCw, Repeat, ShieldCheck, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";
import { PricingCards } from "@/components/shared/PricingCards";
import { Accordion } from "@/components/ui/Accordion";
import { CtaBand } from "@/components/shared/CtaBand";
import { faqs, pillars } from "@/lib/content";

export const metadata: Metadata = {
  title: "Plans & Services",
  description:
    "Online fitness coaching for women - the Strong Girl Project 6-week group programme, or fully personal 1-1 coaching with Your Strong Era. Training, habits and accountability in one portal.",
};

const iconMap: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  habits: Repeat,
  portal: LayoutDashboard,
  safe: ShieldCheck,
};

const included = [
  { icon: Dumbbell, label: "Progressive programming" },
  { icon: Repeat, label: "Habit coaching & accountability" },
  { icon: LayoutDashboard, label: "Everything in your portal" },
  { icon: RefreshCw, label: "Form reviews from me" },
];

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Plans & Services"
        title="Premium coaching, priced with no surprises."
        subtitle="Four pillars of coaching - and two ways to train with me: a 6-week group programme, or fully personal 1-1 coaching. No hidden fees."
      />

      {/* Pillars deep-dive */}
      <Section>
        <div className="space-y-20 lg:space-y-24">
          {pillars.map((o, i) => {
            const Icon = iconMap[o.icon];
            return (
              <div key={o.title} className="mx-auto max-w-2xl text-center">
                <Reveal>
                  <div className="flex justify-center">
                    <Eyebrow>{`Pillar 0${i + 1}`}</Eyebrow>
                  </div>
                </Reveal>
                <Reveal delay={0.05}>
                  <div className="mt-5 flex flex-col items-center gap-4">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-royal-600 text-white shadow-glow">
                      <Icon className="h-7 w-7" />
                    </span>
                    <h2 className="font-display text-3xl sm:text-4xl">{o.title}</h2>
                  </div>
                </Reveal>
                <Reveal delay={0.1}>
                  <p className="mt-5 text-lg leading-relaxed text-muted">{o.blurb}</p>
                </Reveal>
                <Reveal delay={0.15}>
                  <ul className="mt-6 inline-grid gap-3 text-left sm:grid-cols-2">
                    {o.points.map((p) => (
                      <li key={p} className="flex items-start gap-3 text-sm text-ink/80">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-royal-600" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Pricing */}
      <Section className="bg-white">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <div className="flex justify-center">
              <Eyebrow>Choose your plan</Eyebrow>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 text-balance font-display text-4xl sm:text-5xl">
              Support for every starting point.
            </h2>
          </Reveal>
        </div>
        <div className="mt-14">
          <PricingCards />
        </div>

        <div className="mt-12 grid gap-4 rounded-3xl border border-line bg-paper p-6 sm:grid-cols-2 lg:grid-cols-4 lg:p-8">
          {included.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-royal-50 text-royal-600">
                <item.icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-ink">{item.label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <Eyebrow>Before you ask</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-5 text-balance font-display text-4xl sm:text-5xl">
                The details, handled.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 text-lg leading-relaxed text-muted">
                Everything you might be wondering before we begin. Anything else? Bring it to
                your free consult.
              </p>
            </Reveal>
          </div>
          <Reveal>
            <Accordion items={faqs} />
          </Reveal>
        </div>
      </Section>

      <CtaBand
        eyebrow="Ready when you are"
        title="Find the plan that fits your life."
        subtitle="Not sure which is right? Book a free consult and I will recommend the best fit for your goals and budget."
      />
    </>
  );
}
