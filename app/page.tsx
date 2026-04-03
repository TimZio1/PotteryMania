import Link from "next/link";
import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";
import { isPromoActive, PROMO_LABEL } from "@/lib/promo";
import { PromoCountdown } from "@/components/promo-countdown";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Ceramics marketplace and classes",
  description:
    "PotteryMania is opening gradually. Register your studio for free early access — marketplace, classes, and payouts in one place.",
  path: "/",
});

export default function Home() {
  return (
    <MarketingLayout>
      <main>
        <section className="border-b border-stone-200/80 bg-linear-to-b from-white to-stone-50">
          <div className={`${ui.pageContainer} py-16 sm:py-24`}>
            <p className={ui.overline}>Coming soon</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-amber-950 sm:text-5xl sm:leading-tight">
              Something new is coming to ceramics.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-stone-600">
              PotteryMania is opening gradually. We are onboarding studios and selected sellers before the public launch —
              get on the list to hear first.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/early-access" className={ui.buttonPrimary}>
                Register your studio — free
              </Link>
              <Link href="/login" className={ui.buttonSecondary}>
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-stone-200/80 bg-amber-50/50">
          <div className={`${ui.pageContainer} py-14 text-center sm:py-20`}>
            <p className={ui.overline}>For studio owners</p>
            <h2 className="mt-3 text-2xl font-semibold text-amber-950 sm:text-3xl">
              Sell work, fill classes, get paid — in one place.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-stone-600">
              No upfront costs — a small commission only when you earn. Preregister to lock in early access.
            </p>
            {isPromoActive() && (
              <div className="mx-auto mt-5 max-w-sm">
                <p className="text-sm font-medium text-emerald-800">{PROMO_LABEL} — zero activation fee for all studios</p>
                <PromoCountdown className="mt-2 justify-center" />
              </div>
            )}
            <Link href="/early-access" className={`${ui.buttonPrimary} mt-8`}>
              Register your studio — free
            </Link>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}
