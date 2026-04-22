import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal-page-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of service",
  description: "The rules for using PotteryMania — for studios, customers, and visitors.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of service">
      <p>
        These terms govern your use of PotteryMania, including the public website, studio tools, shop features,
        booking features, and related services. By accessing or using PotteryMania, you agree to these terms.
      </p>

      <h2>1. The service</h2>
      <p>
        PotteryMania provides software for pottery studios to create a public website, publish classes, sell products,
        manage bookings, and operate customer-facing commerce through integrated service providers such as Stripe. We may
        improve, modify, suspend, or discontinue parts of the service from time to time.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You are responsible for your account credentials and for activity under your account. You must provide accurate
        information. We may suspend or terminate accounts that violate these terms, harm other users, or create legal
        or security risk.
      </p>

      <h2>3. Studios and commerce</h2>
      <p>
        Studios using PotteryMania are independent businesses. They set their own pricing, fulfilment timelines,
        shipping terms, booking policies, cancellation policies, and refund policies. When a customer buys a product or
        books a class, the underlying contract is between the customer and the studio. PotteryMania provides the software
        and transaction infrastructure that supports that relationship.
      </p>

      <h2>4. Fees and payments</h2>
      <p>
        Paid plans, subscriptions, and any feature-related charges are described on our pricing page, in the dashboard,
        or during checkout. Payment processing fees charged by third-party providers such as Stripe are separate from any
        PotteryMania subscription fees. Taxes, chargebacks, and local consumer obligations remain the responsibility of
        the relevant seller where applicable.
      </p>

      <h2>5. Refunds and cancellations</h2>
      <p>
        Product refunds, booking refunds, reschedules, and studio-specific cancellation rules are set by each studio and
        may vary by listing. PotteryMania may process technical refunds through integrated payment tools when requested by
        the studio or when required for fraud, duplicate payments, or platform integrity.
      </p>

      <h2>6. Acceptable use</h2>
      <ul>
        <li>No unlawful, misleading, or infringing content or listings.</li>
        <li>No interference with the service, scraping beyond reasonable indexing, or attempts to bypass security.</li>
        <li>No harassment, hate, or content that violates others&apos; rights.</li>
      </ul>

      <h2>7. Intellectual property</h2>
      <p>
        We retain rights in the PotteryMania name, logo, software, and branding. You retain rights in your own content;
        you grant us a licence to host, display, and operate the service with respect to content you upload or submit.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The service is provided &quot;as is&quot; to the extent permitted by law. We do not guarantee uninterrupted or
        error-free operation. AI-assisted features produce informational output only and are not professional advice.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by applicable law, we are not liable for indirect, incidental, or consequential
        damages, or for loss of profits, data, or goodwill, arising from your use of the platform.
      </p>

      <h2>10. Privacy and data protection</h2>
      <p>
        Our handling of personal data is described in the{" "}
        <Link href="/privacy" className="font-medium text-amber-900 hover:underline">
          Privacy policy
        </Link>
        . Studios are responsible for handling customer data they collect through the platform in accordance with
        applicable privacy and consumer protection laws.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These terms are interpreted in accordance with the laws applicable to the operator of the PotteryMania service,
        subject to any mandatory consumer protection rules that apply in your location.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these terms can be raised through the support pathways available inside PotteryMania during early
        access. Public support contact details will be published on the website before the end of the early-access period.
      </p>

      <p className="border-t border-stone-200 pt-6 text-stone-500">
        See also{" "}
        <Link href="/privacy" className="font-medium text-amber-900 hover:underline">
          Privacy policy
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
