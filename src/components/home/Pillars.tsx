import { Check, Dumbbell, LayoutDashboard, Repeat, ShieldCheck } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { pillars } from "@/lib/content";

const iconMap = {
  dumbbell: Dumbbell,
  habits: Repeat,
  portal: LayoutDashboard,
  safe: ShieldCheck,
} as const;

export function Pillars() {
  return (
    <Section id="offerings">
      <div className="mx-auto max-w-2xl text-center">
        <Reveal>
          <div className="flex justify-center">
            <Eyebrow>What I do</Eyebrow>
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-5 text-balance font-display text-4xl sm:text-5xl">
            Four pillars. One stronger you.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Personalised training, habits that actually stick, everything in one private
            portal, and a women-only space where you&apos;re genuinely supported - coached
            personally, every step of the way.
          </p>
        </Reveal>
      </div>

      <Stagger className="mt-14 grid gap-6 lg:grid-cols-2">
        {pillars.map((p) => {
          const Icon = iconMap[p.icon];
          return (
            <StaggerItem key={p.title} className="h-full">
              <div className="group h-full rounded-3xl border border-line bg-white p-8 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elevated sm:p-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-royal-600 text-white shadow-glow transition-transform duration-300 group-hover:scale-105">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-display text-2xl">{p.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{p.blurb}</p>
                <ul className="mt-6 space-y-3">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-3 text-sm text-ink/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-royal-600" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>
    </Section>
  );
}
