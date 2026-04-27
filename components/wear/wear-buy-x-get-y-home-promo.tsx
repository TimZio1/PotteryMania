import Link from "next/link";
import { WEAR_BUY_X_GET_Y_CAMPAIGN } from "@/lib/wear-buy-x-get-y-campaign";

const PROMO_ANCHOR = "home-promo-buy-x-get-y";

/** Compact hero badge — links down to the full promo slab. */
export function WearBuyXGetYHeroBadge({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Link
        href={`#${PROMO_ANCHOR}`}
        scroll={true}
        className="group inline-flex max-w-full flex-wrap items-center gap-3 rounded-full border border-(--heat)/50 bg-(--ink)/55 px-4 py-2.5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] backdrop-blur-sm transition hover:border-(--heat)/80 hover:bg-(--heat)/10 sm:gap-4 sm:px-5 sm:py-3"
      >
        <span className="pm-caption shrink-0 text-(--heat)">Running now</span>
        <span className="min-h-px w-px shrink-0 bg-(--clay)/25 sm:hidden" aria-hidden />
        <span className="text-left text-[13px] font-semibold uppercase tracking-[0.12em] text-(--clay) sm:text-sm">
          {WEAR_BUY_X_GET_Y_CAMPAIGN.label}
        </span>
        <span
          aria-hidden
          className="text-(--heat) transition group-hover:translate-x-0.5 group-hover:text-(--clay)"
        >
          ↓
        </span>
      </Link>
    </div>
  );
}

/**
 * Homepage promo slab — full visual treatment so the 4+1 offer isn’t missed vs. a thin top strip.
 */
export function WearBuyXGetYHomePromo() {
  const { buyQuantity, freeQuantity } = WEAR_BUY_X_GET_Y_CAMPAIGN;

  return (
    <section
      id={PROMO_ANCHOR}
      className="relative isolate scroll-mt-24 overflow-hidden border-y border-(--heat)/35 bg-(--ink) text-(--clay)"
      aria-labelledby={`${PROMO_ANCHOR}-heading`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_80%_20%,rgba(255,74,28,0.22),transparent_52%),radial-gradient(ellipse_70%_50%_at_10%_90%,rgba(242,235,224,0.06),transparent_48%)]"
      />
      <div className="pointer-events-none absolute right-[6%] top-1/2 hidden -translate-y-1/2 select-none lg:block">
        <span className="pm-display block text-(--clay) opacity-[0.07] text-[14rem] leading-none lg:text-[17rem]">
          {buyQuantity}+{freeQuantity}
        </span>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-14 sm:px-10 sm:py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-16">
          <div>
            <p className="pm-caption text-(--heat)">Drop perk</p>
            <h2
              id={`${PROMO_ANCHOR}-heading`}
              className="pm-display mt-4 text-(--clay) text-[2.65rem] leading-[0.92] sm:text-[4rem] lg:text-[4.75rem]"
            >
              Buy {buyQuantity}
              <span className="text-(--heat)"> · </span>
              get {freeQuantity} free
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-(--clay)/78 sm:text-lg">
              Every five units unlocks a free one — we always zero out the cheapest pieces first. Coupon discounts apply
              after this bonus.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/wear/shop" className="pm-btn pm-btn--heat group inline-flex justify-center">
                Shop the drop
                <span aria-hidden className="ml-3 transition group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
              <Link href="/wear/cart" className="pm-btn pm-btn--ghost inline-flex justify-center text-center sm:min-w-40">
                View cart
              </Link>
            </div>
          </div>

          <ul className="grid gap-4 text-sm">
            {[
              ["Cheapest first", "Within each set of five, the lowest-priced SKUs are credited free."],
              ["Coupon order", "Codes reduce what you pay after the buy‑bonus math."],
              ["Whole catalog", "Mix tees, hoodies, headwear — same cart, same rule."],
            ].map(([title, body]) => (
              <li
                key={title}
                className="rounded-2xl border border-(--clay)/12 bg-(--clay)/4 px-5 py-4 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.55)] ring-1 ring-(--clay)/8 backdrop-blur-[2px]"
              >
                <p className="pm-caption text-(--heat)">{title}</p>
                <p className="mt-2 leading-relaxed text-(--clay)/75">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
