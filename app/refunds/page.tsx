import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal-page-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Refunds & cancellations",
  description:
    "Each studio sets its own refund and cancellation policy. Here’s how to find it and what to do if something goes wrong.",
  path: "/refunds",
});

export default function RefundsPage() {
  return (
    <LegalPageShell title="Refunds & cancellations">
      <p>
        <strong>Short version:</strong> each studio sets its own rules. Your money goes to the studio directly — we pass
        the payment through Stripe and don’t hold it.
      </p>

      <h2>Where to find the policy</h2>
      <p>The studio’s policy is shown on:</p>
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
        If the studio isn’t responding, reply to your confirmation email and we’ll help you reach them. For card
        disputes, you can also contact your bank.
      </p>

      <h2>Your consumer rights</h2>
      <p>
        A studio’s policy doesn’t override your local consumer protection rights. If a class or product isn’t delivered
        as described, you may be entitled to a refund regardless of the studio’s stated policy.
      </p>

      <h2>Platform and payment fees</h2>
      <p>
        When a studio refunds you, platform or card processing fees are settled between the studio and PotteryMania.
        You receive the amount the studio refunds.
      </p>

      <p className="pt-4">
        Related: <Link href="/terms" className="font-medium text-amber-900 underline-offset-2 hover:underline">Terms of service</Link>
        {" · "}
        <Link href="/privacy" className="font-medium text-amber-900 underline-offset-2 hover:underline">Privacy</Link>
        {" · "}
        <Link href="/vendor-terms" className="font-medium text-amber-900 underline-offset-2 hover:underline">Studio terms</Link>
      </p>
    </LegalPageShell>
  );
}
