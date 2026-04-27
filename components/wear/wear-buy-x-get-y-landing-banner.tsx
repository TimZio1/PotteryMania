import Link from "next/link";
import { WEAR_BUY_X_GET_Y_CAMPAIGN } from "@/lib/wear-buy-x-get-y-campaign";

type WearBuyXGetYLandingBannerProps = {
  /** Use plain text on `/wear/shop` where the link would be redundant. */
  linkToShop?: boolean;
  className?: string;
};

export function WearBuyXGetYLandingBanner({
  linkToShop = true,
  className = "",
}: WearBuyXGetYLandingBannerProps) {
  const title = WEAR_BUY_X_GET_Y_CAMPAIGN.label;

  return (
    <aside
      className={`border-b border-(--ink)/15 bg-(--heat) text-(--ink) ${className}`}
      aria-label="Promotion: buy four get one free"
    >
      <div className="mx-auto max-w-6xl px-4 py-2.5 text-center sm:px-6 sm:py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] sm:text-xs">
          {linkToShop ? (
            <Link
              href="/wear/shop"
              className="underline decoration-(--ink)/35 underline-offset-[3px] transition hover:decoration-(--ink)"
            >
              {title}
            </Link>
          ) : (
            <span>{title}</span>
          )}
        </p>
        <p className="mx-auto mt-1 max-w-2xl text-[10px] font-medium leading-snug normal-case tracking-normal text-(--ink)/88 sm:text-[11px]">
          Lowest-priced pieces go free in each set of five. Coupon discounts apply after this bonus.
        </p>
      </div>
    </aside>
  );
}
