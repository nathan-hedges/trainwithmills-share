import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "gold";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 will-change-transform focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-royal-600 text-white shadow-soft hover:bg-royal-700 hover:-translate-y-0.5 hover:shadow-glow active:translate-y-0",
  secondary:
    "bg-white text-royal-700 shadow-soft ring-1 ring-line hover:-translate-y-0.5 hover:ring-royal-300",
  ghost: "text-royal-700 hover:bg-royal-50",
  gold: "bg-gold-500 text-royal-950 shadow-soft hover:-translate-y-0.5 hover:bg-gold-400 active:translate-y-0",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
  "aria-label"?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  type = "button",
  disabled,
  onClick,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const classes = cn(base, variantClasses[variant], sizeClasses[size], className);

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={ariaLabel} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
