"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accordion({
  items,
}: {
  items: { q: string; a: string }[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.q} className={cn(i !== 0 && "border-t border-line")}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-royal-50/40"
            >
              <span className="font-display text-lg text-ink">{item.q}</span>
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all duration-300",
                  open
                    ? "rotate-45 border-royal-600 bg-royal-600 text-white"
                    : "border-line text-royal-600",
                )}
              >
                <Plus className="h-4 w-4" />
              </span>
            </button>
            <div
              className={cn(
                "grid px-6 transition-all duration-300 ease-out",
                open ? "grid-rows-[1fr] pb-6 opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="max-w-2xl leading-relaxed text-muted">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
