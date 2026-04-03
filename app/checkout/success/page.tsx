import Link from "next/link";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";

export default function CheckoutSuccessPage() {
  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-16 sm:py-24`}>
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-amber-950">Payment received</h1>
          <p className="mt-3 text-stone-600">
            Thank you. The studio will prepare your order or confirm your booking according to their policy.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/marketplace" className={ui.buttonPrimary}>
              Keep shopping
            </Link>
            <Link href="/my-bookings" className={ui.buttonSecondary}>
              View my bookings
            </Link>
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}
