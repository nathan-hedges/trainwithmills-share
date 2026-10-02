"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { signIn } from "next-auth/react";

const fieldWrap =
  "flex h-12 items-center gap-2.5 rounded-xl border border-line bg-paper px-3.5 transition-all focus-within:border-royal-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-royal-500/10";
const inputBare =
  "w-full bg-transparent text-sm text-ink placeholder:text-muted/60 focus:outline-none";

export function LoginForm() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    // redirect:false lets us show an inline error instead of the ?error= URL param.
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setLoading(false);
      setError("That email or password didn't match. Please try again.");
      return;
    }
    // Route by role (and a full navigation so the new session cookie reaches the proxy).
    const session = await fetch("/api/auth/session")
      .then((r) => r.json())
      .catch(() => null);
    window.location.href = session?.user?.role === "COACH" ? "/admin" : "/portal";
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Welcome back</h1>
      <p className="mt-2 text-muted">Sign in to access your plans, check-ins and progress.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-ink">
            Email
          </label>
          <div className={fieldWrap}>
            <Mail className="h-4 w-4 shrink-0 text-muted" />
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@email.com"
              className={inputBare}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="block text-sm font-medium text-ink">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="-my-2 inline-flex items-center py-2 text-xs font-medium text-royal-600 hover:text-royal-700"
            >
              Forgot password?
            </Link>
          </div>
          <div className={fieldWrap}>
            <Lock className="h-4 w-4 shrink-0 text-muted" />
            <input
              id="login-password"
              name="password"
              type={show ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
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

        <label className="-my-2 flex min-h-[2.75rem] cursor-pointer select-none items-center gap-2.5 py-2 text-sm text-muted">
          <input type="checkbox" className="h-5 w-5 rounded border-line accent-royal-600" />
          Keep me signed in
        </label>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-luxe text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={() => signIn("google", { redirectTo: "/portal" })}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-line bg-white text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:shadow-soft"
      >
        <span
          aria-hidden
          className="h-3.5 w-3.5 rounded-full"
          style={{
            backgroundImage:
              "conic-gradient(from -45deg, #ea4335, #fbbc05, #34a853, #4285f4, #ea4335)",
          }}
        />
        Continue with Google
      </button>

      <p className="mt-8 text-center text-sm text-muted">
        Not a client yet?{" "}
        <Link href="/contact" className="font-semibold text-royal-700 hover:text-royal-800">
          Apply for coaching
        </Link>
      </p>
    </div>
  );
}
