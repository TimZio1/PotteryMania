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
    <main className="pm-brand relative min-h-screen overflow-hidden bg-(--ink) text-(--clay)">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_30%_0%,rgba(255,74,28,0.1),transparent_45%)]"
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-10">
        <section className="lg:sticky lg:top-24">
          <p className="pm-caption text-(--heat)">Affiliate program</p>
          <h1 className="pm-display mt-4 text-[2.1rem] text-(--clay) sm:text-[2.75rem]">Earn 10% sharing the drop.</h1>
          <p className="mt-5 text-sm leading-7 text-(--clay)/75 sm:text-base">
            Approved affiliates get a tracked link. We handle orders, delivery, and support — you pick the pieces that fit
            your audience.
          </p>
          <dl className="mt-8 grid gap-3 text-sm">
            <div className="rounded-xl border border-(--clay)/10 border-l-2 border-l-(--heat) bg-(--clay)/4 px-4 py-3">
              <dt className="pm-caption text-(--clay)/70">Commission</dt>
              <dd className="mt-1 text-(--clay)">10% after discounts, before tax and shipping.</dd>
            </div>
            <div className="rounded-xl border border-(--clay)/10 bg-(--clay)/4 px-4 py-3">
              <dt className="pm-caption text-(--clay)/70">Tracking</dt>
              <dd className="mt-1 text-(--clay)/75">30-day browser cookie on your short link.</dd>
            </div>
            <div className="rounded-xl border border-(--clay)/10 bg-(--clay)/4 px-4 py-3">
              <dt className="pm-caption text-(--clay)/70">Payouts</dt>
              <dd className="mt-1 text-(--clay)/75">Stripe transfer when your balance reaches €50.</dd>
            </div>
          </dl>
          <Link
            href="/wear/partner"
            className="mt-8 inline-flex text-sm font-semibold uppercase tracking-[0.12em] text-(--clay)/80 underline decoration-(--clay)/30 underline-offset-4 transition hover:text-(--heat) hover:decoration-(--heat)"
          >
            ← Program details
          </Link>
        </section>
        <AffiliateApplicationForm />
      </div>
    </main>
  );
}
