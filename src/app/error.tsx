"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { ErrorScreen } from "@/components/site/ErrorScreen";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Surface the error in logs / an error-reporting service.
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      eyebrow="Oops"
      title="Something went wrong"
      message="A hiccup on our end interrupted that. Try again -and if it keeps happening, let me know."
    >
      <Button onClick={() => unstable_retry()} size="lg">
        Try again
      </Button>
      <Button href="/" size="lg" variant="secondary">
        Back to home
      </Button>
    </ErrorScreen>
  );
}
