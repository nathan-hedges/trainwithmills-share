import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-line bg-white shadow-soft", className)}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "royal",
}: {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  icon: LucideIcon;
  tone?: "royal" | "gold";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl",
            tone === "royal" ? "bg-royal-50 text-royal-600" : "bg-gold-100 text-gold-600",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 font-display text-3xl tracking-tight">{value}</div>
      {sublabel && <div className="mt-1 text-xs text-muted">{sublabel}</div>}
    </Card>
  );
}

const badgeTones: Record<string, string> = {
  neutral: "bg-slate-100 text-slate-600",
  royal: "bg-royal-50 text-royal-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  gold: "bg-gold-100 text-gold-600",
  red: "bg-red-50 text-red-600",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof badgeTones | string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone] ?? badgeTones.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-line", className)}>
      <div
        className="h-full rounded-full bg-royal-600 transition-all duration-500"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function PageHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
