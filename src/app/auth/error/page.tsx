import type { Metadata } from "next";
import { ErrorScreen } from "@/components/site/ErrorScreen";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Sign-in problem",
  robots: { index: false, follow: false },
};

// Auth.js redirects here with ?error=<code> when sign-in fails. Map the common
// codes to friendly copy; everything else falls back to a generic message.
const messages: Record<string, { title: string; message: string }> = {
  AccessDenied: {
    title: "You need an invite first",
    message:
      "This Google account isn't on my client list yet. Ask me for an invite, then sign in with the exact email I invited.",
  },
  OAuthAccountNotLinked: {
    title: "Try your password instead",
    message:
      "This email already has an account created with a password. Sign in with your email and password rather than Google.",
  },
  Verification: {
    title: "This link has expired",
    message: "That sign-in link is no longer valid. Request a new one and try again.",
  },
  Configuration: {
    title: "Sign-in is temporarily unavailable",
    message:
      "We hit a configuration problem on our end. Please try again shortly, or get in touch with me.",
  },
  default: {
    title: "We couldn't sign you in",
    message: "Something went wrong during sign-in. Please try again.",
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const info = messages[error ?? "default"] ?? messages.default;

  return (
    <ErrorScreen eyebrow="Oops" title={info.title} message={info.message}>
      <Button href="/login" size="lg">
        Back to sign in
      </Button>
      <Button href="/contact" size="lg" variant="secondary">
        Email me
      </Button>
    </ErrorScreen>
  );
}
