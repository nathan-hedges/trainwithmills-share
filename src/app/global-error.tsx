"use client"; // Error boundaries must be Client Components

// global-error replaces the root layout when the root itself throws, so it
// can't rely on globals.css or the next/font variables being present. Styles
// are inlined with the brand palette so it still looks like Train with Mills.
export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "4rem 1.5rem",
          background: "#fafbff",
          color: "#12162e",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          textAlign: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: "28rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.625rem",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                height: "2.25rem",
                width: "2.25rem",
                borderRadius: "0.75rem",
                background: "#2f43d8",
                color: "#fff",
                fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
                fontSize: "1.125rem",
              }}
            >
              M
            </span>
            <span
              style={{
                fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
                fontSize: "1.25rem",
                letterSpacing: "-0.02em",
              }}
            >
              Train with Mills
            </span>
          </div>

          <h1
            style={{
              marginTop: "2rem",
              fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
              fontSize: "2rem",
              letterSpacing: "-0.02em",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.75rem", color: "#586079", lineHeight: 1.6 }}>
            We hit an unexpected error. Please try again -if it keeps happening, let me know.
          </p>

          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => unstable_retry()}
              style={{
                height: "3.5rem",
                padding: "0 2rem",
                borderRadius: "9999px",
                border: "none",
                cursor: "pointer",
                background: "#2f43d8",
                color: "#fff",
                fontSize: "1rem",
                fontWeight: 500,
              }}
            >
              Try again
            </button>
            {/* Plain <a> on purpose: the app shell just crashed, so a full
                page load is safer than client-side navigation here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "3.5rem",
                padding: "0 2rem",
                borderRadius: "9999px",
                background: "#fff",
                color: "#2434ad",
                textDecoration: "none",
                fontSize: "1rem",
                fontWeight: 500,
                boxShadow: "inset 0 0 0 1px #e8eaf4",
              }}
            >
              Back to home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
