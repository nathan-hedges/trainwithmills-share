import type { Metadata } from "next";
import { LegalDoc } from "@/components/shared/LegalDoc";
import { tiers } from "@/lib/content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you use Train with Mills coaching.",
};

export default function TermsPage() {
  return (
    <LegalDoc eyebrow="Legal" title="Terms of Service" updated="12 August 2026">
      <section>
        <h2>1. About these terms</h2>
        <p>
          These terms apply when you use the Train with Mills website and coaching service. By creating an account or
          working with us, you agree to them. If you don&apos;t agree, please don&apos;t use the service.
        </p>
      </section>

      <section>
        <h2>2. The service</h2>
        <p>
          We provide personalised online fitness coaching and nutrition guidance, delivered through this website and portal.
          Programmes are tailored to you but are general fitness guidance, not a substitute for professional medical
          care.
        </p>
      </section>

      <section>
        <h2>3. Not medical advice</h2>
        <p>
          Our coaching is <strong>not medical advice</strong>. Always consult a qualified doctor before starting a new
          exercise or nutrition programme, especially if you are pregnant, have an injury, or have any medical
          condition. You take part in training at your own risk, and you should stop and seek help if you feel unwell.
        </p>
      </section>

      <section>
        <h2>4. Eligibility and health readiness</h2>
        <p>
          You must be 18 or over to use the service. You confirm that the health information you give us is accurate and
          that you are physically able to take part in the programme you&apos;ve chosen.
        </p>
      </section>

      <section>
        <h2>5. Payments and refunds</h2>
        <p>
          Coaching is invite-only: we agree your plan together first, then you pay securely by card (via Stripe) when
          you create your account, before your portal access begins. We offer two plans:
        </p>
        <ul>
          <li>
            <strong>{tiers[0]?.name}:</strong> {tiers[0]?.price}{" "}
            as a one-off payment for the 6-week group programme. Your six weeks run from your group&apos;s confirmed
            start date, and access to the portal ends when the programme ends.
          </li>
          <li>
            <strong>{tiers[1]?.name}:</strong> {tiers[1]?.price}{" "}
            per month, billed on a rolling monthly basis. You can cancel at any time by giving us 7 days&apos; written
            notice before your next billing date.
          </li>
        </ul>
        <p>
          Unless stated otherwise, coaching fees are non-refundable once a coaching period or programme has started.
        </p>
      </section>

      <section>
        <h2>6. Your responsibilities</h2>
        <ul>
          <li>Keep your login details private and don&apos;t share your account.</li>
          <li>Give honest, accurate information so we can coach you safely.</li>
          <li>Use your judgement and never push through pain or injury.</li>
        </ul>
      </section>

      <section>
        <h2>7. Intellectual property</h2>
        <p>
          All training programmes, content and materials we provide remain the property of Train with Mills and are for
          your personal use only. Please don&apos;t copy, resell or share them.
        </p>
      </section>

      <section>
        <h2>8. Acceptable use</h2>
        <p>
          Please use the service respectfully and lawfully. Don&apos;t upload unlawful or harmful content, attempt to
          disrupt the service, or misuse other people&apos;s information.
        </p>
      </section>

      <section>
        <h2>9. Suspension and termination</h2>
        <p>
          You can stop using the service at any time. We may suspend or end access if these terms are broken or if a
          coaching arrangement comes to an end.
        </p>
      </section>

      <section>
        <h2>10. Limitation of liability</h2>
        <p>
          To the extent permitted by law, we are not liable for injury, loss or damage arising from your use of the
          service where you have not followed guidance or medical advice. Nothing in these terms limits liability that
          cannot be limited by law.
        </p>
      </section>

      <section>
        <h2>11. Governing law</h2>
        <p>These terms are governed by the laws of England and Wales.</p>
      </section>

      <section>
        <h2>12. Changes</h2>
        <p>We may update these terms from time to time; the &ldquo;last updated&rdquo; date above shows the latest version.</p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>Questions about these terms? Email <a href="mailto:millie@trainwithmills.co.uk">millie@trainwithmills.co.uk</a>.</p>
      </section>
    </LegalDoc>
  );
}
