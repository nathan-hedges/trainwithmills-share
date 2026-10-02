import Link from "next/link";
import { AtSign, Mail, MapPin } from "lucide-react";
import { brand, navLinks } from "@/lib/content";
import { Container } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";

const year = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-royal-950 text-white/70">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-royal-600/30 blur-3xl"
      />

      <Container className="relative">
        {/* CTA band */}
        <div className="flex flex-col gap-6 border-b border-white/10 py-14 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl text-white sm:text-4xl">
              Your first session is on me.
            </h2>
            <p className="mt-3 text-white/60">
              Book a free, no-pressure consult and let&apos;s map out what&apos;s actually
              possible for you.
            </p>
          </div>
          <Button href={brand.primaryCta.href} variant="gold" size="lg">
            {brand.primaryCta.label}
          </Button>
        </div>

        {/* Columns */}
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <span className="font-display text-2xl text-white">{brand.name}</span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
              Premium online coaching helping women build strength, confidence and habits
              that last.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm tracking-wide text-white">Explore</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="inline-block py-1.5 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/login" className="inline-block py-1.5 transition-colors hover:text-white">
                  Client login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm tracking-wide text-white">Plans</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link href="/services" className="inline-block py-1.5 transition-colors hover:text-white">
                  Strong Girl Project
                </Link>
              </li>
              <li>
                <Link href="/services" className="inline-block py-1.5 transition-colors hover:text-white">
                  Your Strong Era
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm tracking-wide text-white">Get in touch</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-gold-400" />
                <a href={`mailto:${brand.email}`} className="inline-block py-1.5 transition-colors hover:text-white">
                  {brand.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <AtSign className="h-4 w-4 text-gold-400" />
                <Link href={brand.instagramUrl} className="inline-block py-1.5 transition-colors hover:text-white">
                  {brand.instagram} · Instagram
                </Link>
              </li>
              <li className="flex items-center gap-2.5">
                <AtSign className="h-4 w-4 text-gold-400" />
                <Link href={brand.tiktokUrl} className="inline-block py-1.5 transition-colors hover:text-white">
                  {brand.tiktok} · TikTok
                </Link>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-gold-400" />
                <span>{brand.location}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-8 text-xs text-white/45 sm:flex-row">
          <p>
            © {year} {brand.full}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="inline-block py-1.5 transition-colors hover:text-white/80">
              Privacy
            </Link>
            <Link href="/terms" className="inline-block py-1.5 transition-colors hover:text-white/80">
              Terms
            </Link>
            <span className="text-white/30">Crafted with intention.</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
