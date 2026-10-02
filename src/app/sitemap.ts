import type { MetadataRoute } from "next";

// Served at /sitemap.xml. Lists only the public marketing pages — the portal,
// admin, auth and utility routes are intentionally left out (and blocked in robots).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://trainwithmills.co.uk";
  const routes: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/services", priority: 0.9 },
    { path: "/about", priority: 0.8 },
    { path: "/contact", priority: 0.8 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
  ];
  const now = new Date();
  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: r.priority,
  }));
}
