"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

/** Opens Stripe's billing portal (update card, invoices, cancel). */
export function ManageBillingButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (!res.ok) {
        setError((await res.text().catch(() => "")) || "Couldn't open billing just now.");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-royal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-royal-700 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Manage billing
      </button>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
