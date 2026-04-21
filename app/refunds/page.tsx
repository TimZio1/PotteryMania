import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal-page-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Refunds & cancellations",
  description:
    "How refunds and cancellations work on PotteryMania. Each studio sets its own policy — this page explains how to find it and what to do if something goes wrong.",
  path: "/refunds",
});

export default function RefundsPage() {
  return (
    <LegalPageShell title="Refunds & cancellations">
      <p>
        PotteryMania is a platform for independent pottery studios. Each studio sets its own refund and cancellation
        policy. We don’t collect payments for the studio — your money goes to them directly through Stripe.
      </p>

      <h2>Where to find the policy</h2>
      <p>
        Before you book or buy, the studio’s own policy is shown on:
      </p>
      <ul>
        <li>The class page, next to the booking form.</li>
        <li>The product page, before you add to cart.</li>
        <li>Your confirmation email after payment.</li>
      </ul>

      <h2>I want a refund or to cancel</h2>
      <p>
        Contact the studio directly. Their contact details are on their public page and on your confirmation email.
        They can cancel, reschedule, or refund according to their policy.
      </p>
      <p>
        If the studio isn’t responding, reply to your confirmation email and we’ll help you reach them. For disputes
        over a card payment, you can also contact your bank or use your card provider’s chargeback process.
      </p>

      <h2>Consumer rights</h2>
      <p>
        Nothing in a studio’s policy overrides your local consumer protection rights. If a service isn’t delivered as
        described, you may be entitled to a refund regardless of the studio’s stated policy.
      </p>

      <h2>Platform fees</h2>
      <p>
        When a studio refunds you, any platform or payment processing fees are handled between the studio and
        PotteryMania. You receive the amount the studio refunds.
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
