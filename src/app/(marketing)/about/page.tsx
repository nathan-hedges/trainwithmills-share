import type { Metadata } from "next";
import { Compass, Heart, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { ImagePanel } from "@/components/shared/Placeholder";
import { CtaBand } from "@/components/shared/CtaBand";
import { credentials } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description:
    "I'm Millie - a women's strength and nutrition coach, national-level athlete and Sport Science student helping beginners build confidence, capability and habits that last.",
};

const values = [
  {
    icon: Heart,
    title: "Personal, never templated",
    body: "Your plan is built from scratch for your body, history and week - and rewritten as you change. No generic PDFs, ever.",
  },
  {
    icon: Compass,
    title: "Evidence over fads",
    body: "No detoxes, no fear-mongering. Just the proven fundamentals of strength, habits and recovery, applied with consistency.",
  },
  {
    icon: Sparkles,
    title: "Habits that actually stick",
    body: "We build habits you can keep for decades, not a sprint you abandon in three weeks. Progress should fit your real life.",
  },
  {
    icon: ShieldCheck,
    title: "A genuine safe space",
    body: "Women-only, judgement-free coaching where every question is welcome and every win - however small - gets celebrated.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Coaching women to feel strong, capable and at home in their bodies."
        subtitle="I'm Millie - a national-level athlete and Sport Science student, here to be the coach I wish I'd had: knowledgeable, patient and refreshingly free of shame."
      />

      <Section>
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal className="relative lg:sticky lg:top-28">
            <ImagePanel
              className="aspect-[5/6] w-full"
              src="/images/millie-portrait.png"
              alt="Millie Rolls-Hooper, personal trainer and coach"
            />
          </Reveal>

          <div>
            <Reveal>
              <Eyebrow>My story</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-5 text-balance font-display text-4xl sm:text-5xl">
                Hi, I&apos;m Millie.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="mt-5 space-y-4 text-lg leading-relaxed text-muted">
                <p>{`I started coaching after experiencing firsthand how destructive the fitness industry can be when it pushes shame, restriction, and extreme pressure. I knew coaching could and should feel completely different.`}</p>
                <p>{`My journey hasn't been a perfect straight line. As a competitive gymnast during the pandemic, a high-pressure environment led me down a dark path of under-eating. I was ultimately forced to walk away from the sport I loved because it was no longer safe for me to continue.`}</p>
                <p>{`After months of recovery therapy, I turned to the track for "cardio", still trapped in the mindset of trying to burn off the food I was eating to heal. But then everything shifted. I looked around and saw female teammates who were happy, strong, and unapologetically eating to fuel their performance.`}</p>
                <p>{`I quickly realised that when I didn't eat enough, I felt slow, weak, and miserable. When I fuelled properly, I felt fast, powerful, and alive. I fell in love with what my body could do rather than focusing on making it smaller.`}</p>
                <p>{`Today, I am a national-level hurdler and a Sport Science student. I have spent years unlearning toxic narratives and studying what actually works. Lasting results do not come from crash diets or punishing workouts; they come from consistency, proper fuelling, and building a relationship with your body that finally feels kind.`}</p>
                <p>{`Now, I am passionate about helping busy students, nervous beginners, and everyday athletes build real strength and healthy habits without the overwhelm. I want to provide you with a plan that is genuinely yours and be the coach I needed back then: someone in your corner who actually pays attention.`}</p>
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
          </div>
        </div>
      </Section>

      <Section className="bg-white">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <div className="flex justify-center">
              <Eyebrow>What I stand for</Eyebrow>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 text-balance font-display text-4xl sm:text-5xl">
              The principles behind every plan.
            </h2>
          </Reveal>
        </div>
        <Stagger className="mt-14 grid gap-6 sm:grid-cols-2">
          {values.map((v) => (
            <StaggerItem key={v.title} className="h-full">
              <div className="flex h-full gap-5 rounded-3xl border border-line bg-paper p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft sm:p-8">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-royal-600 text-white shadow-glow">
                  <v.icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display text-xl">{v.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{v.body}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <CtaBand
        eyebrow="Work with me"
        title="Let us write your next chapter together."
        subtitle="Book a free consult and find out what is genuinely possible for you - no pressure, no obligation."
      />
    </>
  );
}
