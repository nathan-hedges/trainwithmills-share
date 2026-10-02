"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  destructive = true,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-line bg-white p-6 text-center shadow-elevated">
        <h2 className="font-display text-xl">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "inline-flex h-11 cursor-pointer items-center justify-center rounded-full px-6 text-sm font-medium text-white shadow-soft transition-all hover:-translate-y-0.5",
              destructive ? "bg-red-500 hover:bg-red-600" : "bg-royal-600 hover:bg-royal-700",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
