import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Trustpilot } from "@/components/site/Trustpilot";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <Trustpilot />
    </div>
  );
}
