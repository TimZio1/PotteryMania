import type { Metadata } from "next";
import Link from "next/link";
import { AffiliateApplicationForm } from "@/components/wear/affiliate-application-form";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Apply for the affiliate program — PotteryMania",
  description: "Apply to promote PotteryMania apparel and earn 10% commission on qualifying sales.",
  path: "/wear/partner/apply",
});

export default function AffiliateApplyPage() {
  return (
    <main className="min-h-[70vh] bg-[#f7f2ec] px-4 py-14 text-stone-900 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <section className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Affiliate program</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-amber-950">Earn 10% sharing apparel.</h1>
          <p className="mt-4 text-sm leading-7 text-amber-950/80">
            Approved affiliates receive a tracked link. We handle orders, delivery, and support — you promote the
            pieces that fit your audience.
          </p>
          <dl className="mt-6 grid gap-3 text-sm">
            <div className="rounded-2xl bg-white px-4 py-3">
              <dt className="font-semibold text-amber-950">Commission</dt>
              <dd className="text-stone-600">10% after discounts, before tax/shipping.</dd>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <dt className="font-semibold text-amber-950">Tracking</dt>
              <dd className="text-stone-600">30-day browser cookie using your short link.</dd>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <dt className="font-semibold text-amber-950">Payouts</dt>
              <dd className="text-stone-600">Stripe payout once your balance reaches €50.</dd>
            </div>
          </dl>
          <Link href="/wear/partner" className="mt-6 inline-block text-sm font-semibold text-amber-900 underline">
            Program details
          </Link>
        </section>
        <AffiliateApplicationForm />
      </div>
    </main>
  );
}
