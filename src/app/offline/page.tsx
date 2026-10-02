import type { Metadata } from "next";

export const metadata: Metadata = { title: "Connecting…", robots: { index: false } };

/**
 * The cached loading screen the service worker shows when the connection is
 * slow or offline. Deliberately self-contained: all styling is inline and the
 * retry logic is an inline <script>, so it renders perfectly even when no
 * other asset (CSS/JS chunk) is cached or reachable.
 */
export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 24,
        textAlign: "center",
        background: "linear-gradient(160deg, #f7f8ff, #ffffff 55%, #fdf8ec)",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        color: "#1a1f36",
      }}
    >
      {/* M monogram (inline SVG - no network needed) */}
      <svg width="72" height="72" viewBox="0 0 512 512" style={{ borderRadius: 18 }} aria-hidden>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3a4fe0" />
            <stop offset="1" stopColor="#2330ab" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" fill="url(#g)" />
        <path
          d="M150 372 V150 L256 290 L362 150 V372"
          fill="none"
          stroke="#ffffff"
          strokeWidth="58"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      {/* spinner */}
      <div
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "3px solid rgba(47,67,216,0.15)",
          borderTopColor: "#2f43d8",
          animation: "twm-spin 0.9s linear infinite",
        }}
      />
      <style>{`@keyframes twm-spin { to { transform: rotate(360deg); } }`}</style>

      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Connecting…</h1>
        <p style={{ margin: "8px auto 0", maxWidth: 300, fontSize: 14, lineHeight: 1.6, color: "#586079" }}>
          Your connection is slow or offline right now. We&apos;ll keep trying - this page retries automatically.
        </p>
      </div>

      <button
        style={{
          marginTop: 4,
          border: 0,
          borderRadius: 12,
          background: "#2f43d8",
          color: "#fff",
          padding: "12px 22px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
        id="twm-retry"
      >
        Try again now
      </button>

      {/* Self-contained retry: manual button + auto-retry every 6s + instant retry when back online. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              var retry = function () { location.reload(); };
              var btn = document.getElementById("twm-retry");
              if (btn) btn.addEventListener("click", retry);
              window.addEventListener("online", retry);
              setInterval(function () { if (navigator.onLine) retry(); }, 6000);
            })();
          `,
        }}
      />
    </main>
  );
}
