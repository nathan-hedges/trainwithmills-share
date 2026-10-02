"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

const fieldWrap =
  "flex h-12 items-center gap-2.5 rounded-xl border border-line bg-paper px-3.5 transition-all focus-within:border-royal-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-royal-500/10";
const inputBare = "w-full bg-transparent text-sm text-ink placeholder:text-muted/60 focus:outline-none";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    await fetch("/api/password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-3xl tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-muted">
          If that email is registered, we&apos;ve sent a link to reset your password. It expires in an hour.
        </p>
        <Button href="/login" size="lg" className="mt-7">
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Reset your password</h1>
      <p className="mt-2 text-muted">Enter your email and we&apos;ll send you a link to set a new one.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="fp-email" className="mb-1.5 block text-sm font-medium text-ink">
            Email
          </label>
          <div className={fieldWrap}>
            <Mail className="h-4 w-4 shrink-0 text-muted" />
            <input
              id="fp-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@email.com"
              className={inputBare}
            />
          </div>
        </div>
        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-royal-700 hover:text-royal-800">
          Sign in
        </Link>
      </p>
    </div>
  );
}
