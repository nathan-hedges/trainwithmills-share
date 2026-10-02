import type { Metadata } from "next";
import { LegalDoc } from "@/components/shared/LegalDoc";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Train with Mills collects, uses and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalDoc eyebrow="Legal" title="Privacy Policy" updated="3 September 2026">
      <section>
        <h2>1. Who we are</h2>
        <p>
          Train with Mills (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) provides online fitness coaching and nutrition
          guidance. We are the data controller for the personal data described in this policy. For any privacy question
          or request, contact us at <a href="mailto:millie@trainwithmills.co.uk">millie@trainwithmills.co.uk</a>.
        </p>
      </section>

      <section>
        <h2>2. The information we collect</h2>
        <ul>
          <li>
            <strong>Account details</strong> - your name, email address, and either a password (stored only as a secure
            hash) or your Google sign-in.
          </li>
          <li>
            <strong>Coaching data</strong> - the training, check-in, nutrition and habit information you log, messages
            you send us, and any form-check videos you upload.
          </li>
          <li>
            <strong>Health information</strong> - see section 3.
          </li>
          <li>
            <strong>Usage data</strong> - basic, anonymous analytics about how the site is used (see section 6).
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Health and sensitive data</h2>
        <p>
          Some of what you share (for example energy levels, menstrual-cycle phase, injuries or training readiness) is
          &ldquo;special category&rdquo; health data under UK data protection law. We only collect it to coach you
          safely and effectively, and we process it on the basis of your <strong>explicit consent</strong>, which you
          can withdraw at any time by contacting us.
        </p>
        <p>
          <strong>Cycle tracking</strong> is entirely optional. Your coach sets it up with you, but nothing is recorded
          until you tap to opt in on your own cycle page. If you use it, we store the days you log (bleed days,
          symptoms you select, any note you write) and the contraception type and typical cycle length your coach
          records, so the app can estimate where you are in your cycle.
        </p>
        <ul>
          <li>
            You choose what your coach sees: <strong>nothing at all</strong> (tracked entirely privately, including no
            alerts to her), <strong>the basics</strong> (your predicted phase, cycle day and energy pattern), or
            <strong> everything</strong> (also your symptoms and notes). The default is the basics, and you can change
            it whenever you like.
          </li>
          <li>
            You can permanently delete all of your cycle data at any time from the cycle page. That erases every day
            you have logged and switches tracking off.
          </li>
          <li>
            Cycle information is never used for advertising, never shared with anyone outside Train with Mills, and is
            not used to make automated decisions about you.
          </li>
          <li>
            Predictions are estimates based on what you log. They are training guidance only - they are not medical
            advice, not a diagnosis, and must never be relied on as contraception or for planning a pregnancy.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. How and why we use your data</h2>
        <p>We use your data to deliver and personalise your coaching, communicate with you, and improve our service. Our lawful bases are:</p>
        <ul>
          <li><strong>Contract</strong> - to provide the coaching you&apos;ve signed up for.</li>
          <li><strong>Consent</strong> - for health data and for any marketing emails you opt into.</li>
          <li><strong>Legitimate interests</strong> - to keep the service secure and working well.</li>
        </ul>
      </section>

      <section>
        <h2>5. Who we share it with</h2>
        <p>
          We never sell your data. We share it only with the trusted providers that help us run the service, who process
          it on our instructions:
        </p>
        <ul>
          <li>
            <strong>Stripe</strong> - card payments. Your card details go directly to Stripe and are never
            seen or stored by us.
          </li>
          <li><strong>Vercel</strong> - website hosting and anonymous analytics.</li>
          <li><strong>Cloudflare R2</strong> - secure, private storage for uploaded videos.</li>
          <li><strong>Resend</strong> - sending transactional emails (e.g. sign-up and reset links).</li>
          <li><strong>Google</strong> - if you choose &ldquo;Sign in with Google&rdquo;.</li>
          <li>
            <strong>Trustpilot</strong> - independent review collection. Their script runs on our public pages so we
            can invite you to review our coaching. It does not run inside your private client portal.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Cookies and analytics</h2>
        <p>We keep cookies to the minimum needed to run the service:</p>
        <ul>
          <li>
            <strong>Sign-in cookie</strong> - a single essential cookie that keeps you logged in to your portal.
          </li>
          <li>
            <strong>Payment cookies</strong> - when you pay, Stripe sets essential cookies on the checkout to prevent
            fraud and keep your payment secure.
          </li>
          <li>
            <strong>On-device storage</strong> - your browser stores small bits of app data locally (for example an
            unsent message draft or app preferences). This stays on your device and is never used to track you.
          </li>
        </ul>
        <p>
          Our analytics (Vercel Web Analytics) is privacy-first: it uses no cookies, doesn&apos;t identify you and
          builds no advertising profiles.
        </p>
      </section>

      <section>
        <h2>7. How long we keep it</h2>
        <p>
          We keep your data for as long as you have an account with us, and for a reasonable period afterwards to meet
          legal and administrative obligations. We delete your data 12 months after your coaching ends. You can ask us to delete your account
          and data at any time.
        </p>
      </section>

      <section>
        <h2>8. Your rights</h2>
        <p>Under UK GDPR you have the right to access, correct, delete, restrict, or receive a portable copy of your data, and to withdraw consent. To exercise any of these, email us at <a href="mailto:millie@trainwithmills.co.uk">millie@trainwithmills.co.uk</a>.</p>
      </section>

      <section>
        <h2>9. Security</h2>
        <p>
          Passwords are hashed, uploaded videos are stored privately and served only via short-lived signed links, and
          access to your data is limited to your coach. No system is perfectly secure, but we take reasonable steps to
          protect your information.
        </p>
      </section>

      <section>
        <h2>10. Under-18s</h2>
        <p>The service is intended for adults (18+). We do not knowingly collect data from children.</p>
      </section>

      <section>
        <h2>11. Changes to this policy</h2>
        <p>We may update this policy from time to time; the &ldquo;last updated&rdquo; date above shows the latest version.</p>
      </section>

      <section>
        <h2>12. Contact and complaints</h2>
        <p>
          Questions? Email <a href="mailto:millie@trainwithmills.co.uk">millie@trainwithmills.co.uk</a>. If you&apos;re
          in the UK and unhappy with how we&apos;ve handled your data, you can complain to the Information
          Commissioner&apos;s Office (ICO) at <a href="https://ico.org.uk">ico.org.uk</a>.
        </p>
      </section>
    </LegalDoc>
  );
}
