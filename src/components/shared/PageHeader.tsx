import { Container } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-royal-200/40 blur-3xl" />
        <div className="absolute right-10 top-10 h-40 w-40 animate-float rounded-full bg-gold-200/40 blur-3xl" />
      </div>
      <Container className="py-16 text-center sm:py-20 lg:py-24">
        <Reveal>
          <div className="flex justify-center">
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-5xl tracking-tight sm:text-6xl">
            {title}
          </h1>
        </Reveal>
        {subtitle && (
          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted">
              {subtitle}
            </p>
          </Reveal>
        )}
      </Container>
    </section>
  );
}
