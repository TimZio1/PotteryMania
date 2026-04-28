import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing-layout";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About — PotteryMania Apparel",
  description:
    "Apparel for makers, potters, and artists — made with heat. Built different, worn out loud.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <MarketingLayout>
      <main className="pm-brand bg-[var(--clay)] text-[var(--ink)]">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
          <p className="pm-caption text-[var(--heat)]">About</p>
          <h1 className="pm-display mt-6 text-[2.35rem] leading-[0.96] text-[var(--ink)] sm:text-[3.25rem] lg:text-[3.75rem]">
            Made for people who make things
          </h1>
          <p className="mt-8 text-base leading-relaxed text-[var(--shadow)] sm:text-lg">
            PotteryMania apparel is for studios, potters, artists, and anyone who lives a creative life. Small runs,
            loud identity — gear that keeps up with clay, glaze, and long studio days.
          </p>

          <div className="mt-12 space-y-10 border-t border-[var(--ink)]/10 pt-12">
            <section>
              <h2 className="pm-caption text-[var(--shadow)]">For makers</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--shadow)] sm:text-base">
                Gear that fits clay, glaze, and long studio days — not fast fashion that falls apart.
              </p>
            </section>
            <section>
              <h2 className="pm-caption text-[var(--shadow)]">For studio life</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--shadow)] sm:text-base">
                Whether you teach, fire kilns, or sell work, you can wear something that signals what you do.
              </p>
            </section>
            <section>
              <h2 className="pm-caption text-[var(--shadow)]">The drop</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--shadow)] sm:text-base">
                Fresh pieces, tight curation — checkout shows shipping and timing for your address before you pay.
              </p>
            </section>
          </div>

          <div className="mt-14 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/wear/shop" className="pm-btn pm-btn--heat group inline-flex min-h-12 flex-1 items-center justify-center sm:min-w-48">
              Shop the drop
              <span aria-hidden className="ml-3 transition group-hover:translate-x-0.5">
                →
              </span>
            </Link>
            <Link
              href="/wear/partner"
              className="pm-btn pm-btn--ghost inline-flex min-h-12 flex-1 items-center justify-center sm:min-w-48"
            >
              Affiliate program
            </Link>
          </div>

          <div className="mt-14 rounded-2xl border border-[var(--ink)]/10 bg-white/85 p-6 shadow-[0_18px_60px_-28px_rgba(11,11,11,0.12)] ring-1 ring-[var(--ink)]/5 sm:p-8">
            <h2 className="pm-caption text-[var(--shadow)]">Get in touch</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--shadow)]">
              <li>
                <strong className="font-semibold text-[var(--ink)]">Customer support:</strong>{" "}
                <a
                  href="mailto:support@potterymania.com"
                  className="font-medium text-[var(--heat)] underline decoration-[var(--heat)]/35 underline-offset-4 transition hover:text-[var(--ink)]"
                >
                  support@potterymania.com
                </a>{" "}
                — orders, returns, sizing, anything else.
              </li>
              <li>
                <strong className="font-semibold text-[var(--ink)]">Affiliate program:</strong>{" "}
                <a
                  href="mailto:affiliates@potterymania.com"
                  className="font-medium text-[var(--heat)] underline decoration-[var(--heat)]/35 underline-offset-4 transition hover:text-[var(--ink)]"
                >
                  affiliates@potterymania.com
                </a>
              </li>
              <li>
                <strong className="font-semibold text-[var(--ink)]">Legal &amp; privacy:</strong>{" "}
                <a
                  href="mailto:legal@potterymania.com"
                  className="font-medium text-[var(--heat)] underline decoration-[var(--heat)]/35 underline-offset-4 transition hover:text-[var(--ink)]"
                >
                  legal@potterymania.com
                </a>
              </li>
            </ul>
            <p className="mt-4 text-xs text-[var(--shadow)]/90">We usually reply within one business day.</p>
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}
