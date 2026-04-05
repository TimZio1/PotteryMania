import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal-page-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy policy",
  description: "How PotteryMania collects, uses, and shares personal data when you use the platform.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy policy">
      <p>
        This policy describes how PotteryMania (&quot;we&quot;, &quot;us&quot;) handles personal information. It is a
        practical outline for a marketplace and booking product — replace placeholders and have it reviewed for GDPR,
        CCPA, or other regimes that apply to you.
      </p>

      <h2>1. Who we are</h2>
      <p>
        The data controller is the legal entity operating PotteryMania. Insert registered name, address, and contact
        email for privacy requests.
      </p>

      <h2>2. Data we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> email, password (hashed), role, and profile details you provide.
        </li>
        <li>
          <strong>Commerce:</strong> name, contact details, addresses, order and booking history needed to fulfil
          purchases and classes.
        </li>
        <li>
          <strong>Payments:</strong> payment data is processed by Stripe and similar providers; we typically receive
          tokens and transaction metadata, not full card numbers.
        </li>
        <li>
          <strong>Usage and diagnostics:</strong> logs, device/browser data, and analytics where enabled (see section
          5).
        </li>
        <li>
          <strong>Communications:</strong> messages you send us and email delivery metadata when we notify you about
          orders, bookings, or security.
        </li>
      </ul>

      <h2>3. Why we use data</h2>
      <ul>
        <li>Provide, secure, and improve the platform.</li>
        <li>Process checkout, payouts, and customer support.</li>
        <li>Meet legal obligations and enforce our terms.</li>
        <li>Send service-related messages; marketing only where you have opted in or the law allows.</li>
      </ul>

      <h2>4. Sharing</h2>
      <p>
        We share data with studios when they need it to fulfil your order or booking, with payment and email providers
        that process data on our instructions, and with authorities when required by law. We do not sell personal
        information as a business model; adjust this sentence if your practices differ.
      </p>

      <h2>5. Cookies and analytics</h2>
      <p>
        We may use cookies and similar technologies for session management, preferences, and measurement (for example
        Google Analytics or Meta Pixel when configured). Manage or block cookies through your browser; some features may
        not work without essential cookies.
      </p>

      <h2>6. Retention</h2>
      <p>
        We keep data as long as needed for the purposes above, including legal, tax, and dispute resolution. Specific
        retention periods should be documented in your internal records.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, delete, or export your data, and to object
        to certain processing. Contact us at your designated privacy address to exercise these rights. You may also lodge
        a complaint with a supervisory authority.
      </p>

      <h2>8. Security</h2>
      <p>
        We use industry-standard measures to protect data. No method of transmission over the internet is completely
        secure; we encourage strong passwords and careful handling of sign-in links.
      </p>

      <h2>9. Children</h2>
      <p>
        The service is not directed at children under the age where parental consent is required in your jurisdiction.
        If you believe we have collected such data, contact us for deletion.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this policy and will adjust the &quot;Last updated&quot; date on the page. Material changes may be
        communicated by email or in-product notice where appropriate.
      </p>

      <p className="border-t border-stone-200 pt-6 text-stone-500">
        See also{" "}
        <Link href="/terms" className="font-medium text-amber-900 hover:underline">
          Terms of service
        </Link>
        {" · "}
        <Link href="/vendor-terms" className="font-medium text-amber-900 hover:underline">
          Studio &amp; vendor terms
        </Link>
        .
      </p>
    </LegalPageShell>
  );
}
