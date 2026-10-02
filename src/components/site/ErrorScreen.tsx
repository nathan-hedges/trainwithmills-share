import type { ReactNode } from "react";
import { Logo } from "@/components/site/Logo";

// Shared, on-brand full-page error UI. No hooks, so it works in both server
// components (not-found) and client error boundaries (error.tsx, auth error).
export function ErrorScreen({
  eyebrow,
  title,
  message,
  children,
}: {
  eyebrow?: string;
  title: string;
  message: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-paper px-6 py-16 text-ink">
      {/* soft brand glow, same language as the welcome screen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-24 h-96 w-96 rounded-full bg-royal-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-gold-200/40 blur-3xl"
      />

      <div className="relative w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo />
        </div>

        {eyebrow && (
          <p className="mt-10 font-display text-7xl leading-none tracking-tight text-royal-600">
            {eyebrow}
          </p>
        )}

        <h1 className="mt-4 text-balance font-display text-3xl tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-muted">{message}</p>

        {children && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">{children}</div>
        )}
      </div>
    </div>
  );
}
