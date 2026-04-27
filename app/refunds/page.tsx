import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal-page-shell";
import { buildMetadata } from "@/lib/seo";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";

const APPAREL_DESCRIPTION =
  "Returns, exchanges, and refund policy for PotteryMania apparel — defective items, sizing context, and how to reach us.";
const STUDIO_DESCRIPTION =
  "Each studio sets its own refund and cancellation policy. Here's how to find it and what to do if something goes wrong.";

export const metadata: Metadata = buildMetadata({
  title: "Refunds & returns",
  description: isApparelOnlyLaunch() ? APPAREL_DESCRIPTION : STUDIO_DESCRIPTION,
  path: "/refunds",
});

export default function RefundsPage() {
  if (isApparelOnlyLaunch()) {
    return <ApparelRefundsContent />;
  }
  return <StudioRefundsContent />;
}

function ApparelRefundsContent() {
  return (
    <LegalPageShell title="Returns & refunds">
      <p>
        <strong>Short version:</strong> every PotteryMania piece is made to your order, so we
        can&apos;t accept change-of-mind returns. We do replace anything damaged, defective, or wrong
        — no questions asked, just send a photo.
      </p>

      <h2>Damaged, defective, or wrong item</h2>
      <p>
        If your order arrives with a print defect, fabric flaw, wrong size, or wrong design, contact us
        within <strong>30 days of delivery</strong> and we&apos;ll replace or refund it.
      </p>
      <ul>
        <li>Email <a href="mailto:support@potterymania.com">support@potterymania.com</a> with your order number.</li>
        <li>Attach 1–2 clear photos showing the issue.</li>
        <li>You don&apos;t need to ship the faulty piece back unless we ask.</li>
      </ul>
      <p>
        We typically reply within 1 business day and ship the replacement within 2–4 business days
        once the issue is confirmed.
      </p>

      <h2>Wrong size or fit</h2>
      <p>
        Because every garment is made to order, we can&apos;t take size returns. Please use the size
        guide on the product page before ordering. If your order hasn&apos;t entered production yet
        (usually under 2 hours from purchase), contact us right away — we may be able to switch the
        size for you.
      </p>

      <h2>Lost or never delivered</h2>
      <p>
        If tracking shows delivered but you never got the package, or if 30 days have passed since
        the shipping confirmation with no tracking updates, email us. We&apos;ll start a carrier
        investigation and reship or refund.
      </p>

      <h2>Cancellations</h2>
      <p>
        Order changes and cancellations are only possible <strong>before production starts</strong>
        {" "}(usually within 1–2 hours of purchase). After that, production has started
        specifically for you and we cannot cancel it.
      </p>

      <h2>How refunds are paid</h2>
      <p>
        Approved refunds are issued to the original payment method through Stripe. Most banks
        post the refund within 5–10 business days.
      </p>

      <h2>Your consumer rights</h2>
      <p>
        Made-to-order garments are exempt from the EU 14-day cooling-off period for distance
        selling because they are produced to your order (Directive 2011/83/EU, Art. 16(c)). Your other
        consumer rights — including the right to a remedy for defective goods — are unaffected.
      </p>

      <h2>Contact</h2>
      <p>
        Order issues: <a href="mailto:support@potterymania.com">support@potterymania.com</a> · We
        usually reply within one business day.
      </p>
      <p className="text-sm text-stone-600">
        Affiliate program: <a href="mailto:affiliates@potterymania.com">affiliates@potterymania.com</a>
        {" · "}
        Legal &amp; privacy: <a href="mailto:legal@potterymania.com">legal@potterymania.com</a>
      </p>

      <p className="pt-4">
        Related:{" "}
        <Link href="/terms" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Terms of service
        </Link>
        {" · "}
        <Link href="/privacy" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Privacy
        </Link>
        {" · "}
        <Link href="/wear/shop" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Back to shop
        </Link>
      </p>
    </LegalPageShell>
  );
}

function StudioRefundsContent() {
  return (
    <LegalPageShell title="Refunds & cancellations">
      <p>
        <strong>Short version:</strong> each studio sets its own rules. Your money goes to the studio directly — we pass
        the payment through Stripe and don&apos;t hold it.
      </p>

      <h2>Where to find the policy</h2>
      <p>The studio&apos;s policy is shown on:</p>
      <ul>
        <li>The class page, next to the booking form.</li>
        <li>The product page, before you add to cart.</li>
        <li>Your confirmation email.</li>
      </ul>

      <h2>To cancel or get a refund</h2>
      <p>
        Contact the studio. Their details are on their studio page and in your confirmation email. They can cancel,
        reschedule, or refund based on their policy.
      </p>
      <p>
        If the studio isn&apos;t responding, reply to your confirmation email and we&apos;ll help you reach them. For card
        disputes, you can also contact your bank.
      </p>

      <h2>Your consumer rights</h2>
      <p>
        A studio&apos;s policy doesn&apos;t override your local consumer protection rights. If a class or product isn&apos;t delivered
        as described, you may be entitled to a refund regardless of the studio&apos;s stated policy.
      </p>

      <h2>Platform and payment fees</h2>
      <p>
        When a studio refunds you, platform or card processing fees are settled between the studio and PotteryMania.
        You receive the amount the studio refunds.
      </p>

      <p className="pt-4">
        Related:{" "}
        <Link href="/terms" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Terms of service
        </Link>
        {" · "}
        <Link href="/privacy" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Privacy
        </Link>
        {" · "}
        <Link href="/vendor-terms" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Studio terms
        </Link>
      </p>
    </LegalPageShell>
  );
}
