"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/Button";

function ReturnInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState<"checking" | "complete" | "open" | "error">("checking");
  const [mode, setMode] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      return;
    }
    let active = true;
    fetch(`/api/billing/session-status?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { status?: string; mode?: string } | null) => {
        if (!active) return;
        setMode(d?.mode ?? null);
        if (d?.status === "complete") setState("complete");
        else if (d?.status === "open") setState("open");
        else setState("error");
      })
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, [sessionId]);

  if (state === "checking") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-royal-600" />
        <p className="text-muted">Confirming your payment…</p>
      </div>
    );
  }

  if (state === "complete") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gold-100 text-gold-600 shadow-soft">
          <PartyPopper className="h-8 w-8" />
        </span>
        <h1 className="font-display text-3xl text-ink">You&apos;re in!</h1>
        <p className="max-w-sm text-muted">
          {mode === "payment"
            ? "Your place on the Strong Girl Project is secured and your portal is unlocked. I'll place you in a group and confirm your start date - welcome to Train with Mills."
            : "Your subscription is active and your portal is unlocked. I'll have your plan ready soon - welcome to Train with Mills."}
        </p>
        <Button href="/portal" size="lg">
          Open your portal
        </Button>
      </div>
    );
  }

  if (state === "open") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="font-display text-2xl text-ink">Payment not finished</h1>
        <p className="max-w-sm text-muted">It looks like checkout wasn&apos;t completed - you can pick it up again below.</p>
        <Button href="/subscribe" size="lg">
          Back to checkout
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="font-display text-2xl text-ink">Something went wrong</h1>
      <p className="max-w-sm text-muted">
        We couldn&apos;t confirm your payment. If you were charged, don&apos;t worry - your access will unlock
        automatically within a minute or two. Otherwise, try again.
      </p>
      <div className="flex gap-3">
        <Button href="/subscribe" variant="secondary">
          Back to checkout
        </Button>
        <Button href="/portal">Try the portal</Button>
      </div>
      <p className="text-xs text-muted">
        Stuck? Email <Link href="mailto:millie@trainwithmills.co.uk" className="underline">millie@trainwithmills.co.uk</Link>
      </p>
    </div>
  );
}

export default function SubscribeReturnPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-5 py-10">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-royal-600" />}>
        <ReturnInner />
      </Suspense>
    </main>
  );
}
