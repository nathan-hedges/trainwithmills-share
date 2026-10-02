import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { brand } from "@/lib/content";

export function CtaBand({
  eyebrow = "Start today",
  title = "Ready to feel strong in your own skin?",
  subtitle = "Book a free 30-minute consult. We will map out exactly what is possible for you - no pressure, no obligation.",
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <Reveal>
          <div
            className="relative isolate overflow-hidden rounded-[2rem] px-6 py-16 text-center shadow-elevated sm:px-16 sm:py-20"
            style={{
              backgroundImage:
                "radial-gradient(120% 140% at 50% 0%, #2f43d8 0%, #1f2c6e 55%, #141942 100%)",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -left-16 top-0 h-64 w-64 rounded-full bg-royal-400/30 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-gold-400/20 blur-3xl"
            />
            <div className="relative mx-auto max-w-2xl">
              <div className="flex justify-center">
                <Eyebrow tone="light">{eyebrow}</Eyebrow>
              </div>
              <h2 className="mt-5 text-balance font-display text-4xl text-white sm:text-5xl">
                {title}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">{subtitle}</p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button href={brand.primaryCta.href} variant="gold" size="lg">
                  {brand.primaryCta.label}
                </Button>
                <Button
                  href="/services"
                  size="lg"
                  className="bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
                >
                  See the plans
                </Button>
              </div>
              <p className="mt-6 text-sm text-white/50">
                Free 30-minute consult · No obligation · Rolling monthly, cancel anytime
              </p>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
