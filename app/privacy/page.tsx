import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal-page-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy policy",
  description: "How PotteryMania collects, uses, and shares personal data when you use the platform.",
  path: "/privacy",
});

const LAST_UPDATED = "2026-04-07";

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy policy">
      <p className="text-sm text-stone-500">
        Last updated: <time dateTime={LAST_UPDATED}>{LAST_UPDATED}</time>
      </p>
      <p>
        This policy explains how PotteryMania collects, uses, stores, and shares personal data when you use the public
        website, create an account, run a studio on the platform, make a purchase, or book a class.
      </p>

      <h2>1. Who we are</h2>
      <p>
        PotteryMania is the controller for the personal data we process to operate the platform, secure accounts,
        support studios, and run customer-facing bookings and commerce. During early access, privacy-related requests are
        handled through the support pathways available inside the product. Public contact details will be published on the
        website before the end of the early-access period.
      </p>

      <h2>2. Data we collect</h2>
      <p>
        We collect account details, transaction information, booking information, customer support communications,
        technical logs, and analytics events required to operate PotteryMania safely and effectively.
      </p>
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
          6).
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

      <h2>4. Legal bases</h2>
      <p>
        Where GDPR or similar rules apply, we rely on contractual necessity, legitimate interests, legal obligations,
        and consent where appropriate. For example, we process data to create accounts, complete bookings, operate
        checkout, detect abuse, and communicate essential service updates.
      </p>

      <h2>5. Sharing and subprocessors</h2>
      <p>
        We share data with studios when they need it to fulfil an order or booking, with payment processors such as
        Stripe, hosting and infrastructure providers such as Vercel, media and upload providers such as Cloudinary when
        enabled, email providers that deliver transactional messages, and authorities when disclosure is legally required.
        We do not sell personal data as a business model.
      </p>

      <h2>6. Cookies and analytics</h2>
      <p>
        We use cookies and similar technologies for authentication, session continuity, security, preferences, and
        measurement. Non-essential analytics only run after you grant consent via the cookie banner. Blocking essential
        cookies may prevent sign-in, checkout, or dashboard features from working correctly.
      </p>

      <h2>7. Retention</h2>
      <p>
        We keep personal data only for as long as needed to operate the service, comply with legal and tax obligations,
        resolve disputes, and maintain basic security records. Studios may remove certain customer records through the
        dashboard, but some transaction records must be retained for operational and compliance reasons.
      </p>

      <h2>8. Your rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, delete, export, or object to certain uses of
        your data. You may also have the right to withdraw consent where processing depends on consent. Self-service data
        export and account anonymization controls are available in your account page.
      </p>

      <h2>9. International transfers</h2>
      <p>
        If we transfer personal data across borders, we take reasonable steps to do so using appropriate legal and
        operational safeguards required by applicable law.
      </p>

      <h2>10. Security</h2>
      <p>
        We use technical and organisational safeguards intended to protect personal data. No internet-based service can be
        guaranteed perfectly secure, so you should also use strong passwords and keep sign-in methods private.
      </p>

      <h2>11. Children</h2>
      <p>
        PotteryMania is not directed at children below the age at which parental consent is required under applicable
        law. If you believe personal data has been collected from a child inappropriately, contact us through support so
        we can review and delete it where required.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update this policy and will revise the &quot;Last updated&quot; date when we do. Material changes may also
        be communicated by email or in-product notice where appropriate.
      </p>

      <p className="border-t border-stone-200 pt-6 text-stone-500">
        See also{" "}
        <Link href="/terms" className="font-medium text-amber-900 hover:underline">
          Terms of service
        </Link>
        {" · "}
        <Link href="/vendor-terms" className="font-medium text-amber-900 hover:underline">
          Studio terms
        </Link>
        .
      </p>
    </LegalPageShell>
  );
}
