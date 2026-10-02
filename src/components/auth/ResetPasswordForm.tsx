"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

const fieldWrap =
  "flex h-12 items-center gap-2.5 rounded-xl border border-line bg-paper px-3.5 transition-all focus-within:border-royal-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-royal-500/10";
const inputBare = "w-full bg-transparent text-sm text-ink placeholder:text-muted/60 focus:outline-none";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-3xl tracking-tight">Link isn&apos;t valid</h1>
        <p className="mt-2 text-muted">This reset link is missing or malformed. Request a fresh one.</p>
        <Button href="/forgot-password" size="lg" className="mt-7">
          Request a new link
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-3xl tracking-tight">Password updated</h1>
        <p className="mt-2 text-muted">You can now sign in with your new password.</p>
        <Button href="/login" size="lg" className="mt-7">
          Go to sign in
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Those passwords don't match.");
    setLoading(true);
    const res = await fetch("/api/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (res.ok) setDone(true);
    else setError((await res.text()) || "Couldn't reset your password. The link may have expired.");
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Set a new password</h1>
      <p className="mt-2 text-muted">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="rp-password" className="mb-1.5 block text-sm font-medium text-ink">
            New password
          </label>
          <div className={fieldWrap}>
            <Lock className="h-4 w-4 shrink-0 text-muted" />
            <input
              id="rp-password"
              type={show ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={inputBare}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="text-muted transition-colors hover:text-ink"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="rp-confirm" className="mb-1.5 block text-sm font-medium text-ink">
            Confirm password
          </label>
          <div className={fieldWrap}>
            <Lock className="h-4 w-4 shrink-0 text-muted" />
            <input
              id="rp-confirm"
              type={show ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              className={inputBare}
            />
          </div>
        </div>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? "Saving…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
