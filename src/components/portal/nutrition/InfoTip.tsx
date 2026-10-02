import { Info } from "lucide-react";

/**
 * A small info icon that reveals "why it matters" text on hover or keyboard
 * focus. Pure CSS (group-hover / focus-within) - no JS state needed.
 */
export function InfoTip({ text, label = "Why it matters" }: { text: string; label?: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        className="grid h-5 w-5 place-items-center rounded-full text-muted transition-colors hover:text-royal-600 focus:text-royal-600 focus:outline-none"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-left text-xs leading-relaxed text-white opacity-0 shadow-elevated transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink" />
      </span>
    </span>
  );
}
