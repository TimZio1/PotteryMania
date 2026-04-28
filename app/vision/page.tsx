import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing-layout";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Our vision | PotteryMania",
    description:
      "PotteryMania vision: the first global network & directory for independent artists and studios.",
    path: "/vision",
  });
}

export default function VisionPage() {
  return (
    <MarketingLayout>
      <main className="pm-brand pm-slab-dark relative min-h-[calc(100vh-8rem)] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_50%_-20%,rgba(255,74,28,0.14),transparent_55%)]"
          aria-hidden
        />
        <section className="relative mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-24">
          <p className="pm-caption text-[var(--heat)]">PotteryMania vision</p>
          <h1 className="pm-display mt-8 text-[2.1rem] leading-[0.96] text-[var(--clay)] sm:text-[3rem] lg:text-[3.5rem]">
            The first global network & directory for independent artists and studios.
          </h1>
          <p className="mt-8 text-base leading-relaxed text-[var(--clay)]/82 sm:text-lg">
            We believe independent pottery artists and studios should be easier to find, easier to support, and easier to
            grow.
          </p>
          <p className="mt-5 text-base leading-relaxed text-[var(--clay)]/78 sm:text-lg">
            PotteryMania is built around visibility, identity, and control. Artists and studios keep their own voice,
            customers, and way of working.
          </p>
          <p className="mt-5 text-base leading-relaxed text-[var(--clay)]/75 sm:text-lg">
            We are starting with founding artists and studios and improving with their feedback.
          </p>
          <div className="mt-12">
            <Link
              href="/early-access"
              className="pm-btn pm-btn--heat group inline-flex min-h-12 items-center justify-center px-8"
            >
              Register your artist or studio profile
              <span aria-hidden className="ml-3 transition group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}
