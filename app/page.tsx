import Link from "next/link";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";

export default function Home() {
  return (
    <MarketingLayout>
      <main>
        <section className="border-b border-stone-200/80 bg-gradient-to-b from-white to-stone-50">
          <div className={`${ui.pageContainer} py-16 sm:py-24`}>
            <p className={ui.overline}>Marketplace &amp; studio classes</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-amber-950 sm:text-5xl sm:leading-tight">
              Discover pottery studios and ceramics you will not find in big-box stores.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-stone-600">
              Shop pieces from independent makers, or book a wheel session or workshop — checkout is secure with Stripe.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/marketplace" className={ui.buttonPrimary}>
                Browse the shop
              </Link>
              <Link href="/classes" className={ui.buttonSecondary}>
                Find a class
              </Link>
            </div>
          </div>
        </section>
        <section className={`${ui.pageContainer} py-14 sm:py-20`}>
          <h2 className="text-lg font-semibold text-amber-950">How it works</h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { t: "Browse", d: "Explore studios, ceramics, and scheduled experiences in one place." },
              { t: "Book or buy", d: "Reserve a class with clear pricing, or add pieces to your cart." },
              { t: "Pay safely", d: "Stripe handles payment; studios fulfil orders and sessions." },
            ].map((s) => (
              <li key={s.t} className={ui.cardMuted}>
                <p className="text-sm font-semibold text-amber-950">{s.t}</p>
                <p className="mt-2 text-sm text-stone-600">{s.d}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </MarketingLayout>
  );
}
