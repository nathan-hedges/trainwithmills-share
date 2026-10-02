"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff, Lock, Mail, ShieldAlert, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { AvatarUpload } from "@/components/portal/AvatarUpload";
import { Button } from "@/components/ui/Button";

type InviteInfo = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  plan: string;
};

const fieldWrap =
  "flex h-12 items-center gap-2.5 rounded-xl border border-line bg-paper px-3.5 transition-all focus-within:border-royal-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-royal-500/10";
const inputBare =
  "w-full bg-transparent text-sm text-ink placeholder:text-muted/60 focus:outline-none";

export function SignupForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  // The invite now comes from the real database via the API, not the mock store.
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "invalid">("loading");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Once the account exists and she's signed in, offer a photo before the portal.
  const [addPhoto, setAddPhoto] = useState(false);
  const router = useRouter();

  // 1. Look the invite up on the backend (404 = invalid / used / expired).
  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    let active = true;
    fetch(`/api/invites/${token}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("invalid"))))
      .then((data: InviteInfo) => {
        if (!active) return;
        setInvite(data);
        setFirstName(data.firstName ?? "");
        setLastName(data.lastName ?? "");
        setStatus("ready");
      })
      .catch(() => active && setStatus("invalid"));
    return () => {
      active = false;
    };
  }, [token]);

  if (status === "loading") {
    return (
      <div className="w-full max-w-md text-center text-sm text-muted">Checking your invite…</div>
    );
  }

  if (status === "invalid" || !invite) {
    return (
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-3xl tracking-tight">This link isn&apos;t valid</h1>
        <p className="mt-2 text-muted">
          Your invite link is invalid, already used, or expired. Ask your coach to send a new one.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button href="/login" size="lg">
            Go to sign in
          </Button>
          <Button href="/contact" size="lg" variant="secondary">
            Email me
          </Button>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (firstName.trim().length < 1 || lastName.trim().length < 1)
      return setError("Please enter your first and last name.");
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    if (password !== confirm) return setError("Those passwords don't match.");

    setLoading(true);
    // 2. Create the account in the database.
    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, firstName: firstName.trim(), lastName: lastName.trim(), password }),
    });
    if (!res.ok) {
      setLoading(false);
      setError(
        res.status === 409
          ? "An account with this email already exists - try signing in."
          : "We couldn't create your account. The link may have expired.",
      );
      return;
    }
    // 3. Log them in - but stay put, so we can offer a profile photo while she
    //    has a session (the upload needs one) and before the portal loads.
    const signedIn = await signIn("credentials", {
      email: invite!.email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (signedIn?.error) {
      setError("Your account was created - please sign in.");
      return;
    }
    setAddPhoto(true);
  }

  async function handleGoogle() {
    setError("");
    if (firstName.trim().length < 1 || lastName.trim().length < 1)
      return setError("Please enter your first and last name.");
    setLoading(true);
    // Sign out any current session FIRST. Otherwise Auth.js links this Google
    // account to whoever is already signed in (e.g. the coach while testing),
    // instead of creating the invited client's own account.
    await signOut({ redirect: false });
    // The Auth.js `signIn` callback then matches the Google email to the pending invite.
    signIn("google", { redirectTo: "/portal" });
  }

  // Account created and signed in - offer a photo before the portal loads.
  if (addPhoto) {
    return (
      <div className="w-full max-w-md text-center">
        <h2 className="font-display text-2xl text-ink">Add a photo?</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          It shows on your messages so the girls and I know who you are. Skip it and we&apos;ll just use your
          initials - you can add one any time in Settings.
        </p>
        <div className="mt-6 flex justify-center">
          <AvatarUpload initials={`${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "?"} userId="me" />
        </div>
        <div className="mt-8">
          <Button size="lg" onClick={() => router.push("/portal")}>
            Continue to my portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-3 py-1 text-xs font-semibold text-royal-700">
        <Check className="h-3.5 w-3.5" />
        {invite.plan}
      </span>
      <h1 className="mt-4 font-display text-3xl tracking-tight sm:text-4xl">Create your account</h1>
      <p className="mt-2 text-muted">
        Welcome to Train with Mills. Set up your login to access your plan and start training.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="su-first" className="mb-1.5 block text-sm font-medium text-ink">
              First name
            </label>
            <div className={fieldWrap}>
              <User className="h-4 w-4 shrink-0 text-muted" />
              <input
                id="su-first"
                type="text"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className={inputBare}
              />
            </div>
          </div>
          <div>
            <label htmlFor="su-last" className="mb-1.5 block text-sm font-medium text-ink">
              Last name
            </label>
            <div className={fieldWrap}>
              <input
                id="su-last"
                type="text"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className={inputBare}
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="su-email" className="mb-1.5 block text-sm font-medium text-ink">
            Email
          </label>
          <div className={`${fieldWrap} opacity-80`}>
            <Mail className="h-4 w-4 shrink-0 text-muted" />
            <input id="su-email" type="email" value={invite.email} readOnly className={inputBare} />
          </div>
          <p className="mt-1 text-xs text-muted">This is the address your coach invited.</p>
        </div>

        <div>
          <label htmlFor="su-password" className="mb-1.5 block text-sm font-medium text-ink">
            Password
          </label>
          <div className={fieldWrap}>
            <Lock className="h-4 w-4 shrink-0 text-muted" />
            <input
              id="su-password"
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
          <label htmlFor="su-confirm" className="mb-1.5 block text-sm font-medium text-ink">
            Confirm password
          </label>
          <div className={fieldWrap}>
            <Lock className="h-4 w-4 shrink-0 text-muted" />
            <input
              id="su-confirm"
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
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-luxe text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-line bg-white text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:shadow-soft disabled:opacity-60"
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
      <p className="mt-2 text-center text-xs text-muted">
        Your Google email must be the same as your invite email ({invite.email}).
      </p>

      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-royal-700 hover:text-royal-800">
          Sign in
        </Link>
      </p>
    </div>
  );
}
