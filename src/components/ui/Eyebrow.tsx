import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Eyebrow({
  children,
  className,
  tone = "royal",
}: {
  children: ReactNode;
  className?: string;
  tone?: "royal" | "light";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-luxe",
        tone === "royal" ? "text-royal-600" : "text-gold-300",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("h-px w-7", tone === "royal" ? "bg-royal-300" : "bg-gold-400/60")}
      />
      {children}
    </span>
  );
}
