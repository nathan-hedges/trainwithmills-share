import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";
import { ImagePanel } from "@/components/shared/Placeholder";
import { credentials } from "@/lib/content";

export function AboutPreview() {
  return (
    <Section>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal className="relative order-last lg:order-first">
          <ImagePanel
            className="aspect-[5/6] w-full"
            src="/images/millie-portrait.png"
            alt="Millie Rolls-Hooper, personal trainer and coach"
          />
        </Reveal>

        <div>
          <Reveal>
            <Eyebrow>Meet your coach</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 text-balance font-display text-4xl sm:text-5xl">
              Hi, I&apos;m Millie.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-5 space-y-4 text-lg leading-relaxed text-muted">
              <p>
                My goal is to help you feel stronger, move confident, and proud of what your
                body can do. As a Sport Science student and athlete, I&apos;ve seen both
                sides of fitness.
              </p>
              <p>
                I&apos;ve struggled with extreme dieting, spent years learning what actually
                works, and discovered that lasting results come from consistency not
                restriction. Now I&apos;m passionate about helping women build strength,
                confidence and healthy habits without the overwhelm.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <ul className="mt-7 flex flex-wrap gap-2.5">
              {credentials.map((c) => (
                <li
                  key={c}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink/75 shadow-soft"
                >
                  {c}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.2}>
            <Link
              href="/about"
              className="group mt-8 inline-flex items-center gap-2 font-semibold text-royal-700"
            >
              Read my story
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
