import type { Metadata } from "next";
import { LineChart, MessageSquare, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/site/Logo";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Client Login",
  description: "Secure client portal for Train with Mills coaching members.",
};

const perks = [
  { icon: LineChart, text: "Track your workouts, check-ins and progress" },
  { icon: MessageSquare, text: "Message your coach and get form reviews" },
  { icon: ShieldCheck, text: "Your data, private and secure" },
];

export default async function LoginPage() {
  // Already signed in? Don't show the login form - send them to their portal.
  const session = await auth();
  if (session?.user) {
    redirect((session.user as { role?: string }).role === "COACH" ? "/admin" : "/portal");
  }

  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative isolate hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{
          backgroundImage:
            "radial-gradient(120% 120% at 15% 10%, #2f43d8 0%, #1f2c6e 50%, #141942 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-10 h-80 w-80 rounded-full bg-royal-400/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 bottom-0 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl"
        />

        <Logo light />

        <div className="relative max-w-md">
          <h2 className="text-balance font-display text-4xl leading-tight">
            Your strongest self is on the other side of this door.
          </h2>
          <ul className="mt-8 space-y-4">
            {perks.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-white/85">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <p.icon className="h-4 w-4" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/55">
          Your private space to train, track and stay accountable.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-16 sm:px-10">
        <LoginForm />
      </div>
    </div>
  );
}
