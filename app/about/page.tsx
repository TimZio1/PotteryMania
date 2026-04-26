import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing-layout";
import { buildMetadata } from "@/lib/seo";
import { ui } from "@/lib/ui-styles";

export const metadata: Metadata = buildMetadata({
  title: "About — PotteryMania Apparel",
  description:
    "Apparel for makers, potters, and artists. We print on demand and ship through a production partner so you get quality pieces without the warehouse.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <MarketingLayout>
      <main className="bg-[#f7f2ec] px-4 py-12 text-stone-900 sm:px-6 sm:py-16">
        <div className={`${ui.pageContainer} mx-auto max-w-2xl`}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">About</p>
          <h1 className="mt-4 font-serif text-3xl text-amber-950 sm:text-4xl">Made for people who make things</h1>
          <p className="mt-6 text-sm leading-relaxed text-stone-700">
            PotteryMania apparel is for studios, potters, artists, and anyone who lives a creative life. Pieces are
            printed when you order—less waste, no piles of unsold stock.
          </p>
          <div className="mt-10 space-y-8 border-t border-stone-200/80 pt-10">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">For makers</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">
                Gear that fits clay, glaze, and long studio days—not fast fashion that falls apart.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">For studio life</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">
                Whether you teach, fire kilns, or sell work, you can wear something that signals what you do.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Print on demand</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">
                We work with a production partner for printing and fulfillment. Shipping options and timelines are
                confirmed at checkout.
              </p>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/wear/shop"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-amber-800/40 bg-amber-950 px-8 text-sm font-medium text-white transition hover:bg-amber-900"
            >
              Shop T-shirts
            </Link>
            <Link
              href="/wear/partner"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-stone-300 bg-white px-8 text-sm font-medium text-stone-900 transition hover:border-amber-400/80"
            >
              Affiliate program
            </Link>
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}
