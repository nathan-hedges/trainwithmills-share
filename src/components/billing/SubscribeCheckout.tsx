"use client";

import { useCallback, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

// Loaded once per page - Stripe's script is fetched lazily on first render.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

/** Stripe's embedded Checkout, mounted inside /subscribe. */
export function SubscribeCheckout() {
  const [error, setError] = useState("");

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      setError(msg || "We couldn't start checkout. Please refresh and try again.");
      throw new Error(msg || "checkout failed");
    }
    const { clientSecret } = (await res.json()) as { clientSecret: string };
    return clientSecret;
  }, []);

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <p className="p-6 text-center text-sm text-muted">
        Payments aren&apos;t configured yet - please check back shortly.
      </p>
    );
  }

  if (error) {
    return <p className="p-6 text-center text-sm font-medium text-red-600">{error}</p>;
  }

  return (
    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
