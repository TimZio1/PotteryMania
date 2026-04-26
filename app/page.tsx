import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing-layout";
import { buildMetadata } from "@/lib/seo";
import { organizationJsonLd, toJsonLdScript, websiteJsonLd } from "@/lib/structured-data";
import { WEAR_VISUAL_IMAGES } from "@/lib/wear-config";
import { ui } from "@/lib/ui-styles";
import { PrivateGuideForm } from "@/app/early-access/private-guide-form";
import { HomeLaunchStats } from "@/app/home-launch-stats";
import { HomeScrollReset } from "@/app/home-scroll-reset";

export const dynamic = "force-dynamic";

const IMPACT_SITE_VERIFICATION = "886dc8c3-9975-4330-92e4-e34425f85624";

const heroPrimaryCta =
  "inline-flex min-h-12 items-center justify-center border border-amber-300/60 bg-white px-8 text-sm font-medium tracking-wide text-stone-900 shadow-[var(--pm-shadow-rest)] transition hover:bg-amber-50/90";
const heroSecondaryCta =
  "inline-flex min-h-11 items-center justify-center border border-stone-300/80 bg-transparent px-6 text-sm font-medium tracking-wide text-stone-800 transition hover:border-amber-400/80 hover:bg-white/60";
const textLinkClass =
  "text-sm font-medium text-stone-600 underline decoration-stone-400/60 underline-offset-4 transition hover:text-amber-950 hover:decoration-amber-700/60";

export async function generateMetadata(): Promise<Metadata> {
  const base = buildMetadata({
    title: "PotteryMania — apparel for makers, printed on demand",
    description:
      "Small-batch clothes for people who build things with their hands. Shop the drop — printed when you order. Studios can join early access for the maker platform.",
    path: "/",
  });
  return {
    ...base,
    other: {
      "impact-site-verification": IMPACT_SITE_VERIFICATION,
    },
  };
}

export default function Home() {
  const jsonLd = toJsonLdScript([websiteJsonLd(), organizationJsonLd()]);
  return (
    <MarketingLayout>
      <HomeScrollReset />
      <main className="bg-[#f7f2ec] text-stone-900">
        {/* Wear-first hero — aligned with /wear */}
        <section className={`${ui.pageContainer} py-12 sm:py-20`}>
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">PotteryMania</p>
            <h1 className="mt-4 font-serif text-3xl leading-snug tracking-tight text-amber-950 sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
              Clothes for people who build things with their hands.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-stone-600 sm:text-lg">
              Small runs. No warehouse. Each piece is printed when you order — for you, not for a shelf.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
              <Link href="/wear/shop" className={heroPrimaryCta}>
                Shop the drop
              </Link>
              <Link href="/wear" className={heroSecondaryCta}>
                Explore the drop
              </Link>
              <Link href="/wear/partner" className={`${textLinkClass} sm:ml-1`}>
                Partner program
              </Link>
            </div>
            <div className="relative mx-auto mt-14 aspect-[21/9] max-w-3xl overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-100 sm:aspect-[2/1]">
              <Image
                src={WEAR_VISUAL_IMAGES.primary}
                alt={WEAR_VISUAL_IMAGES.primaryAlt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 48rem"
                priority
              />
            </div>
          </div>
        </section>

        {/* Studio platform early access */}
        <section className="border-t border-stone-200/80 bg-[#ede8df] py-10 sm:py-14">
          <div className={ui.pageContainer}>
            <div className="mx-auto max-w-3xl">
              <div className="rounded-[var(--radius-card)] border border-stone-700/40 bg-[#1a1816] p-[var(--pm-space-6)] text-white shadow-[var(--pm-shadow-lift)] sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Studios & makers</p>
                <h2 className="mt-2 font-serif text-2xl leading-tight text-white sm:text-3xl">
                  The studio platform is still here — now alongside the shop.
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  Register for early access if you run a studio or teach: profile, discovery, bookings, and commerce tools.
                  Buying merch doesn&apos;t require an account.
                </p>

                <div className="mt-6">
                  <HomeLaunchStats />
                </div>

                <div id="register-studio" className="mt-6 border-t border-white/15 pt-6">
                  <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Early access registration
                  </div>
                  <PrivateGuideForm />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </MarketingLayout>
  );
}
