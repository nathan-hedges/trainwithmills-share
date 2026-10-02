import type { MetadataRoute } from "next";

// Served at /robots.txt. Marketing pages are crawlable; the portal, admin, API
// and auth/utility routes are kept out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/portal", "/api", "/login", "/welcome", "/reset-password", "/forgot-password", "/pwa", "/offline"],
    },
    sitemap: "https://trainwithmills.co.uk/sitemap.xml",
  };
}
