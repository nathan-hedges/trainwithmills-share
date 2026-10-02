import type { MetadataRoute } from "next";

// Web app manifest → served at /manifest.webmanifest. Makes the site installable
// as a standalone PWA (its own icon + no browser chrome when launched).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Train with Mills",
    short_name: "TWM",
    description: "Your training, habits and coaching - all in one place.",
    start_url: "/portal",
    // Whole-site scope so the /portal → /login redirect (and /pwa) stay inside the
    // installed app rather than kicking out to the browser.
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2f43d8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
