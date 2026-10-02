import type { Metadata } from "next";
import { AtSign, CalendarCheck, Clock, Mail, MapPin } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";
import { ContactForm } from "@/components/contact/ContactForm";
import { brand } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Book your free, no-pressure consult with me. Tell me about your goals and I'll reply within three business days.",
};

const expect = [
  "A relaxed 30-minute call - zero pressure or hard sell",
  "An honest take on whether we are the right fit",
  "A clear, personalised recommendation to reach your goals",
];

const details = [
  { icon: Mail, label: "Email", value: brand.email, href: `mailto:${brand.email}` },
  { icon: AtSign, label: "Instagram", value: brand.instagram },
  { icon: MapPin, label: "Coaching", value: brand.location },
  { icon: Clock, label: "Response time", value: "Within 3 business day" },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Your free consult starts here."
        subtitle="Tell me a little about where you are and where you want to be. I read and reply to every message personally."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <Eyebrow>What to expect</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-5 text-balance font-display text-3xl sm:text-4xl">
                A conversation, not a sales pitch.
              </h2>
            </Reveal>

            <Reveal delay={0.1}>
              <ul className="mt-7 space-y-4">
                {expect.map((e) => (
                  <li key={e} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-royal-600 text-white">
                      <CalendarCheck className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-muted">{e}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-line bg-line shadow-soft sm:grid-cols-2">
                {details.map((d) => (
                  <div key={d.label} className="bg-white p-5">
                    <div className="flex items-center gap-2 text-royal-600">
                      <d.icon className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-luxe text-muted">
                        {d.label}
                      </span>
                    </div>
                    {d.href ? (
                      <a
                        href={d.href}
                        className="mt-2 block font-medium text-ink transition-colors hover:text-royal-700"
                      >
                        {d.value}
                      </a>
                    ) : (
                      <p className="mt-2 font-medium text-ink">{d.value}</p>
                    )}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <ContactForm />
          </Reveal>
        </div>
      </Section>
    </>
  );
}
