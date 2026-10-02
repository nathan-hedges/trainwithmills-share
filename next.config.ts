import type { NextConfig } from "next";

// Security headers, applied to every route. The CSP is deliberately minimal:
// it covers the directives that can't break the app (no script/style
// allowlisting - a strict CSP needs careful testing of login, uploads,
// analytics and the PWA before it's safe to add).
const securityHeaders = [
  // Clickjacking: nobody may put this site in an iframe (CSP form for modern
  // browsers + X-Frame-Options for older ones).
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Never MIME-sniff responses into a different content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Cross-site navigations only ever see the origin - never full URLs (which
  // carry invite/reset tokens on some pages).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera and location stay off entirely. The microphone is allowed for our
  // OWN origin only, because the coach records voice notes in the browser -
  // with `microphone=()` the browser refuses without even showing a prompt.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
