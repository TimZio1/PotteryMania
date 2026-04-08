import type { Metadata } from "next";
import Link from "next/link";
import { metaPublicPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaPublicPage(
  "Checkout complete",
  "/checkout/success",
  "Your PotteryMania payment was received. View next steps and receipts.",
);
import { MarketingLayout } from "@/components/marketing-layout";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

export default function CheckoutSuccessPage() {
  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-16 sm:py-24`}>
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-amber-950">Payment received</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Thank you for your order! A confirmation email has been sent to your inbox.
          </p>

          <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm">
            <h2 className="text-sm font-semibold text-amber-950">What happens next</h2>
            <ol className="mt-3 space-y-3 text-sm text-stone-600">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">1</span>
                <span>The studio receives your order and begins preparing it.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">2</span>
                <span>For bookings, check your email for date and time details.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">3</span>
                <span>Track everything from your bookings page.</span>
              </li>
            </ol>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/marketplace" className={ui.buttonPrimary}>
              Keep shopping
            </Link>
            <Link href="/my-bookings" className={ui.buttonSecondary}>
              View my bookings
            </Link>
          </div>

          <div className="mt-10 rounded-2xl border border-stone-200/80 bg-stone-50/80 p-5">
            <p className="text-sm font-medium text-amber-950">Explore more</p>
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              <Link href="/classes" className={cn(ui.buttonGhost, "text-sm")}>
                Browse classes
              </Link>
              <Link href="/wear/shop" className={cn(ui.buttonGhost, "text-sm")}>
                Shop wearables
              </Link>
            </div>
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}

