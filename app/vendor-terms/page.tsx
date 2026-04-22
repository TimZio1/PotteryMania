import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal-page-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Studio terms",
  description:
    "Extra terms for studios selling classes and products on PotteryMania.",
  path: "/vendor-terms",
});

const LAST_UPDATED = "2026-04-07";

export default function VendorTermsPage() {
  return (
    <LegalPageShell title="Studio terms">
      <p className="text-sm text-stone-500">
        Last updated: <time dateTime={LAST_UPDATED}>{LAST_UPDATED}</time>
      </p>
      <p>
        These terms apply when you register as a <strong>studio owner</strong> on PotteryMania and use studio tools for
        products, classes, bookings, and payouts. They supplement our general{" "}
        <Link href="/terms" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Terms of service
        </Link>
        .
      </p>

      <h2>1. Studio relationship</h2>
      <p>
        You operate as an independent business. PotteryMania provides software infrastructure and does not become the
        merchant of record for your products or classes unless a specific checkout flow states otherwise. You remain
        responsible for your listings, prices, taxes, customer communications, consumer rights, and local compliance.
      </p>

      <h2>2. Studio profile and listings</h2>
      <p>
        Information you submit (business name, VAT/tax IDs, descriptions, photos) must be accurate and not misleading.
        You grant us a licence to display this content to run the service. You retain ownership of your creative
        content; don&apos;t upload material you don&apos;t have rights to use.
      </p>

      <h2>3. Payments and Stripe Connect</h2>
      <p>
        Payouts typically run through <strong>Stripe Connect</strong> or another payment processor configured by
        PotteryMania. You must complete onboarding, keep payout information current, and comply with the processor&apos;s
        requirements. Subscription fees, feature charges, or other applicable studio fees are shown on our pricing page,
        in your dashboard, or during activation.
      </p>

      <h2>4. Orders, bookings, and fulfilment</h2>
      <p>
        You honour the policies you publish (shipping, pickup, cancellations, rescheduling). You handle refunds and
        disputes with customers according to law and the rules you set, except where the platform processes automated
        refunds through integrated payment flows.
      </p>

      <h2>5. Payout timing and reserves</h2>
      <p>
        Payout timing is primarily controlled by the connected payment processor. PotteryMania may delay access to
        certain funds, features, or payouts where necessary to investigate fraud, fulfil legal requirements, resolve
        disputes, or protect customers and the platform.
      </p>

      <h2>6. Platform conduct</h2>
      <ul>
        <li>No counterfeit, unsafe, or prohibited items; no harassment or fraud.</li>
        <li>No circumvention of checkout to avoid agreed fees without our written consent.</li>
        <li>Respond to customers and booking requests in good faith within reasonable time.</li>
      </ul>

      <h2>7. Ranking and visibility</h2>
      <p>
        We may order or highlight studios and listings using automated or manual signals (performance, activity,
        configuration). We do not guarantee placement or traffic.
      </p>

      <h2>8. Suspension</h2>
      <p>
        We may suspend or remove access for breach of these terms, legal risk, payment issues, or harm to buyers or
        the platform. Where practical we will give notice; serious cases may require immediate action.
      </p>

      <h2>9. Intellectual property</h2>
      <p>
        You retain ownership of your studio brand, product photography, descriptions, and other content you upload. You
        grant PotteryMania a licence to host, display, reproduce, and distribute that content as needed to operate,
        promote, and support the platform.
      </p>

      <h2>10. Liability</h2>
      <p>
        To the extent allowed by law, we are not liable for lost profits, indirect damages, or issues arising solely
        between you and your customers. Our aggregate liability for studio tools is subject to the same framework as the
        general terms unless mandatory law requires otherwise.
      </p>

      <h2>11. Contact</h2>
      <p>
        Use the support pathways available inside PotteryMania for studio compliance, billing, or account questions during
        early access. Public contact details will be published on the website before the end of the early-access period.
      </p>

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
