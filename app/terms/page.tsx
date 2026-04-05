import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal-page-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of service",
  description: "Terms governing use of the PotteryMania platform for studios, customers, and visitors.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of service">
      <p>
        These terms explain how you may use PotteryMania (&quot;we&quot;, &quot;us&quot;, &quot;the platform&quot;). They are a starting
        template — have them reviewed by qualified counsel before relying on them in production, especially if you
        operate across multiple countries.
      </p>

      <h2>1. The service</h2>
      <p>
        PotteryMania provides software for ceramic studios to list products and experiences, take bookings, and
        process payments through integrated providers (for example Stripe). We may change or discontinue features with
        reasonable notice where practicable.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You are responsible for your account credentials and for activity under your account. You must provide accurate
        information. We may suspend or terminate accounts that violate these terms, harm other users, or create legal
        or security risk.
      </p>

      <h2>3. Studios and commerce</h2>
      <p>
        Studios are independent sellers. They set their own policies for shipping, classes, cancellations, and refunds
        where applicable. The contract for a purchase or booking is between the customer and the studio; we facilitate
        the transaction through the platform.
      </p>

      <h2>4. Fees and payments</h2>
      <p>
        Platform fees, subscriptions, and payment processing are described at checkout, in your dashboard, or in separate
        agreements. Taxes and chargebacks may apply according to law and payment-provider rules.
      </p>

      <h2>5. Acceptable use</h2>
      <ul>
        <li>No unlawful, misleading, or infringing content or listings.</li>
        <li>No interference with the service, scraping beyond reasonable indexing, or attempts to bypass security.</li>
        <li>No harassment, hate, or content that violates others&apos; rights.</li>
      </ul>

      <h2>6. Intellectual property</h2>
      <p>
        We retain rights in the PotteryMania name, logo, software, and branding. You retain rights in your own content;
        you grant us a licence to host, display, and operate the service with respect to content you upload or submit.
      </p>

      <h2>7. Disclaimers</h2>
      <p>
        The service is provided &quot;as is&quot; to the extent permitted by law. We do not guarantee uninterrupted or
        error-free operation. AI-assisted features produce informational output only and are not professional advice.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by applicable law, we are not liable for indirect, incidental, or consequential
        damages, or for loss of profits, data, or goodwill, arising from your use of the platform.
      </p>

      <h2>9. Governing law</h2>
      <p>
        Unless otherwise agreed in writing, these terms are governed by the laws you designate with your counsel. Replace
        this section with your chosen jurisdiction and dispute-resolution process.
      </p>

      <h2>10. Contact</h2>
      <p>
        For questions about these terms, contact us using the support or legal address published on the site when
        available.
      </p>

      <p className="border-t border-stone-200 pt-6 text-stone-500">
        See also{" "}
        <Link href="/privacy" className="font-medium text-amber-900 hover:underline">
          Privacy policy
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
