import type { Metadata } from "next";
import { ErrorScreen } from "@/components/site/ErrorScreen";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <ErrorScreen
      eyebrow="404"
      title="We can't find that page"
      message="The page you're looking for doesn't exist, or it may have moved. Let's get you back on track."
    >
      <Button href="/" size="lg">
        Back to home
      </Button>
      <Button href="/contact" size="lg" variant="secondary">
        Email me
      </Button>
    </ErrorScreen>
  );
}
