import type { Metadata, Viewport } from "next";
import { Fraunces, Jost } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { RegisterSW } from "@/components/RegisterSW";
import { StandaloneRedirect } from "@/components/StandaloneRedirect";

const dmSans = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trainwithmills.co.uk"),
  title: {
    default: "Train with Mills - 1-on-1 Fitness & Nutrition Coaching for Women",
    template: "%s · Train with Mills",
  },
  description:
    "Premium online 1-on-1 fitness and nutrition coaching for women. Personalised training, cycle-aware nutrition and real accountability. Book your free consult.",
  keywords: [
    "women's fitness coaching",
    "online personal trainer for women",
    "nutrition coaching",
    "1-on-1 coaching",
    "beginner strength training",
  ],
  openGraph: {
    title: "Train with Mills - Coaching for Women",
    description:
      "Personalised 1-on-1 training and nutrition coaching for women. Book your free consult.",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Train with Mills - Coaching for Women",
    description: "Personalised 1-on-1 training and nutrition coaching for women. Book your free consult.",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "TWM",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2f43d8",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body className="antialiased">
        <StandaloneRedirect />
        <RegisterSW />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
