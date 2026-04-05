import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal-page-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Studio & vendor terms",
  description:
    "Additional terms for ceramic studios selling and teaching on PotteryMania — payouts, listings, and platform rules.",
  path: "/vendor-terms",
});

export default function VendorTermsPage() {
  return (
    <LegalPageShell title="Studio & vendor terms">
      <p>
        These terms apply when you register as a <strong>studio / vendor</strong> on PotteryMania and use seller tools
        (shop, classes, bookings, payouts). They supplement our general{" "}
        <Link href="/terms" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Terms of service
        </Link>
        . Replace placeholders with your legal entity, jurisdiction, and fee schedule after counsel review.
      </p>

      <h2>1. Seller relationship</h2>
      <p>
        You operate as an independent business. PotteryMania is a software and marketplace layer — not the seller of
        your goods or classes. You are responsible for your listings, pricing, taxes where applicable, consumer rights,
        and compliance with craft, safety, and professional regulations in your markets.
      </p>

      <h2>2. Studio profile and listings</h2>
      <p>
        Information you submit (business name, VAT/tax IDs, descriptions, photos) must be accurate and not misleading.
        You grant us a licence to display this content to run the service. You retain ownership of your creative
        content; don&apos;t upload material you don&apos;t have rights to use.
      </p>

      <h2>3. Payments and Stripe Connect</h2>
      <p>
        Payouts typically run through <strong>Stripe Connect</strong> (or another processor we configure). You must
        complete onboarding, keep payout details current, and comply with Stripe&apos;s terms. We may collect platform
        fees, subscriptions, or feature charges as shown in your dashboard or separate agreements.
      </p>

      <h2>4. Orders, bookings, and fulfilment</h2>
      <p>
        You honour the policies you publish (shipping, pickup, cancellations, rescheduling). You handle refunds and
        disputes with customers according to law and the rules you set, except where the platform processes automated
        refunds through integrated payment flows.
      </p>

      <h2>5. Marketplace conduct</h2>
      <ul>
        <li>No counterfeit, unsafe, or prohibited items; no harassment or fraud.</li>
        <li>No circumvention of checkout to avoid agreed fees without our written consent.</li>
        <li>Respond to customers and booking requests in good faith within reasonable time.</li>
      </ul>

      <h2>6. Ranking and visibility</h2>
      <p>
        We may order or highlight studios and listings using automated or manual signals (performance, activity,
        configuration). We do not guarantee placement or traffic.
      </p>

      <h2>7. Suspension</h2>
      <p>
        We may suspend or remove access for breach of these terms, legal risk, payment issues, or harm to buyers or
        the platform. Where practical we will give notice; serious cases may require immediate action.
      </p>

      <h2>8. Liability</h2>
      <p>
        To the extent allowed by law, we are not liable for lost profits, indirect damages, or issues arising solely
        between you and your customers. Our aggregate liability for the vendor programme is subject to the same
        framework as the general terms unless a mandatory law says otherwise.
      </p>

      <h2>9. Contact</h2>
      <p>Use the support channel published on the site for vendor compliance and account questions.</p>

      <p className="border-t border-stone-200 pt-6 text-stone-500">
        <Link href="/terms" className="font-medium text-amber-900 hover:underline">
          Terms of service
        </Link>
        <span className="mx-2 text-stone-300" aria-hidden>
          ·
        </span>
        <Link href="/privacy" className="font-medium text-amber-900 hover:underline">
          Privacy policy
        </Link>
      </p>
    </LegalPageShell>
  );
}
