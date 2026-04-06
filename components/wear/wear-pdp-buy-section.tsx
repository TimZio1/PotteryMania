"use client";

import { useEffect, useMemo, useState } from "react";
import { WEAR_EVENT_KINDS, trackWearEvent } from "@/lib/wear-analytics-client";
import { formatWearMoney } from "@/lib/wear-money";
import { WearAddToCartButton } from "@/components/wear/wear-add-to-cart-button";

export type WearPdpVariant = {
  id: string;
  label: string;
  priceCents: number | null;
  stockQuantity: number | null;
};

export function WearPdpBuySection({
  productId,
  basePriceCents,
  currency,
  variants,
}: {
  productId: string;
  basePriceCents: number;
  currency: string;
  variants: WearPdpVariant[];
}) {
  const [variantId, setVariantId] = useState<string>("");

  useEffect(() => {
    trackWearEvent(WEAR_EVENT_KINDS.productView, { productId });
  }, [productId]);

  const needsVariant = variants.length > 0;

  const selected = useMemo(
    () => (variantId ? variants.find((v) => v.id === variantId) ?? null : null),
    [variantId, variants],
  );

  const displayCents = selected ? (selected.priceCents ?? basePriceCents) : basePriceCents;

  const fromCents = useMemo(() => {
    if (variants.length === 0) return basePriceCents;
    const inStock = variants.filter((v) => v.stockQuantity == null || v.stockQuantity > 0);
    const prices = (inStock.length ? inStock : variants).map((v) => v.priceCents ?? basePriceCents);
    return Math.min(basePriceCents, ...prices);
  }, [variants, basePriceCents]);

  const soldOut =
    selected && selected.stockQuantity != null && selected.stockQuantity <= 0
      ? true
      : needsVariant && !selected
        ? false
        : false;

  const canAdd =
    !soldOut && (!needsVariant || (variantId.length > 0 && selected && (selected.stockQuantity == null || selected.stockQuantity > 0)));

  return (
    <div>
      {needsVariant ? (
        <div className="mt-2">
          <label htmlFor="wear-variant" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Option
          </label>
          <select
            id="wear-variant"
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="mt-2 w-full border border-white/15 bg-neutral-900 px-4 py-3 text-sm text-white"
          >
            <option value="">Choose…</option>
            {variants.map((v) => {
              const oos = v.stockQuantity != null && v.stockQuantity <= 0;
              const price = v.priceCents != null ? v.priceCents : basePriceCents;
              return (
                <option key={v.id} value={v.id} disabled={oos}>
                  {v.label}
                  {oos ? " — sold out" : ` — ${formatWearMoney(price, currency)}`}
                </option>
              );
            })}
          </select>
        </div>
      ) : null}

      <p className="mt-6 text-2xl text-neutral-200">
        {needsVariant && !selected ? (
          <>
            <span className="text-neutral-500">From </span>
            {formatWearMoney(fromCents, currency)}
          </>
        ) : (
          formatWearMoney(displayCents, currency)
        )}
      </p>

      <div className="mt-10">
        {canAdd ? (
          <WearAddToCartButton
            productId={productId}
            variantId={needsVariant ? variantId : null}
            label="Add to cart"
          />
        ) : (
          <p className="text-sm text-neutral-500">{soldOut ? "This option is sold out." : "Choose an option to continue."}</p>
        )}
      </div>
    </div>
  );
}
