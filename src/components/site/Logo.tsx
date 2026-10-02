import Link from "next/link";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/content";

export function Logo({
  className,
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label={`${brand.name} - home`}
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-royal-600 text-white shadow-soft transition-transform duration-300 group-hover:-translate-y-0.5">
        <span className="font-display text-lg leading-none">M</span>
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold-400 ring-2 ring-paper"
        />
      </span>
      <span
        className={cn(
          "font-display text-xl tracking-tight",
          light ? "text-white" : "text-ink",
        )}
      >
        {brand.name}
      </span>
    </Link>
  );
}
