"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Wraps one draggable block (a standalone exercise or a superset/circuit group)
 * with a left-side grip handle. Only the handle carries the drag listeners, so
 * the inputs/buttons inside the block stay fully interactive.
 */
export function SortableBlock({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex items-stretch gap-1.5", isDragging && "relative z-10 opacity-80")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="flex w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted/40 transition-colors hover:bg-paper hover:text-muted active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
