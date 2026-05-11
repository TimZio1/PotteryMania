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
  metaContentId?: string;
};

export function WearPdpBuySection({
  productId,
  productName,
  basePriceCents,
  currency,
  variants,
  metaContentId,
  studioId,
  viewCartHref,
  selectedColor: controlledSelectedColor,
  onSelectedColorChange,
  lineImageSrc,
}: {
  productId: string;
  /** Display name forwarded to Meta Pixel `ViewContent` / `AddToCart` events. */
  productName?: string;
  basePriceCents: number;
  currency: string;
  variants: WearPdpVariant[];
  /** Meta catalog offer id for no-variant products. Variant products use the selected variant id. */
  metaContentId?: string;
  studioId?: string;
  viewCartHref?: string;
  selectedColor?: string;
  onSelectedColorChange?: (color: string) => void;
  /** PDP hero image the shopper sees (colour / angle) — passed through to the add-to-cart toast. */
  lineImageSrc?: string;
}) {
  const variantMeta = useMemo(() => {
    return variants.map((variant) => {
      const [sizeRaw, colorRaw] = variant.label.split(" · ");
      return {
        ...variant,
        size: sizeRaw?.trim() || variant.label,
        color: colorRaw?.trim() || "Default",
      };
    });
  }, [variants]);
  const defaultMetaContentId = metaContentId ?? variantMeta[0]?.metaContentId ?? productId;

  const colors = useMemo(() => [...new Set(variantMeta.map((variant) => variant.color))], [variantMeta]);
  const [internalSelectedColor, setInternalSelectedColor] = useState<string>(colors[0] ?? "");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const isColorControlled = controlledSelectedColor !== undefined;
  const selectedColor = isColorControlled ? controlledSelectedColor : internalSelectedColor;

  useEffect(() => {
    /** Defer one tick so `<MetaPixel />` afterInteractive can define `fbq` before ViewContent. */
    const t = window.setTimeout(() => {
      trackWearEvent(WEAR_EVENT_KINDS.productView, {
        productId,
        contentIds: [defaultMetaContentId],
        contentName: productName,
        value: Number((basePriceCents / 100).toFixed(2)),
        currency,
      });
    }, 0);
    return () => window.clearTimeout(t);
  }, [productId, productName, basePriceCents, currency, defaultMetaContentId]);

  useEffect(() => {
    const fallbackColor = colors[0] ?? "";
    if (isColorControlled) {
      if ((!controlledSelectedColor || !colors.includes(controlledSelectedColor)) && fallbackColor) {
        onSelectedColorChange?.(fallbackColor);
      }
      return;
    }
    setInternalSelectedColor(fallbackColor);
  }, [colors, controlledSelectedColor, isColorControlled, onSelectedColorChange]);

  const needsVariant = variantMeta.length > 0;

  const colorVariants = useMemo(
    () => variantMeta.filter((variant) => variant.color === selectedColor),
    [selectedColor, variantMeta],
  );

  const sizes = useMemo(() => [...new Set(colorVariants.map((variant) => variant.size))], [colorVariants]);

  useEffect(() => {
    setSelectedSize((current) => {
      if (sizes.length === 0) return "";
      if (sizes.length === 1) return sizes[0]!;
      return sizes.includes(current) ? current : "";
    });
  }, [sizes]);

  const selected = useMemo(
    () =>
      selectedColor && selectedSize
        ? variantMeta.find((variant) => variant.color === selectedColor && variant.size === selectedSize) ?? null
        : null,
    [selectedColor, selectedSize, variantMeta],
  );

  const displayCents = selected ? (selected.priceCents ?? basePriceCents) : basePriceCents;
  const selectedMetaContentId = selected?.metaContentId ?? defaultMetaContentId;

  const fromCents = useMemo(() => {
    if (variantMeta.length === 0) return basePriceCents;
    const inStock = variantMeta.filter((v) => v.stockQuantity == null || v.stockQuantity > 0);
    const prices = (inStock.length ? inStock : variantMeta).map((v) => v.priceCents ?? basePriceCents);
    return Math.min(basePriceCents, ...prices);
  }, [variantMeta, basePriceCents]);

  const soldOut =
    selected && selected.stockQuantity != null && selected.stockQuantity <= 0
      ? true
      : needsVariant && !selected
        ? false
        : false;

  const canAdd =
    !soldOut && (!needsVariant || (selected && (selected.stockQuantity == null || selected.stockQuantity > 0)));

  const variantSummaryForToast = needsVariant ? selected?.label : undefined;

  const swatchClass = (active: boolean) =>
    `inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-xs font-medium transition ${
      active
        ? "border-amber-300 bg-amber-100 text-amber-950"
        : "border-stone-200 bg-white text-stone-700 hover:border-amber-300/60 hover:bg-amber-50/60"
    }`;

  const sizeClass = (active: boolean, disabled: boolean) =>
    `inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 text-sm font-medium transition ${
      disabled
        ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
        : active
          ? "border-amber-300 bg-amber-100 text-amber-950"
          : "border-stone-200 bg-white text-stone-700 hover:border-amber-300/60 hover:bg-amber-50/60"
    }`;

  function setSelectedColor(nextColor: string) {
    if (!isColorControlled) {
      setInternalSelectedColor(nextColor);
    }
    onSelectedColorChange?.(nextColor);
  }

  return (
    <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-5 lg:border-0 lg:p-0 lg:shadow-none">
      {needsVariant ? (
        <div className="space-y-4 sm:space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Color</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={swatchClass(color === selectedColor)}
                  onClick={() => setSelectedColor(color)}
                  aria-pressed={color === selectedColor}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Size</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sizes.map((size) => {
                const variant = colorVariants.find((row) => row.size === size) ?? null;
                const disabled = variant?.stockQuantity != null && variant.stockQuantity <= 0;
                return (
                  <button
                    key={size}
                    type="button"
                    className={sizeClass(size === selectedSize, Boolean(disabled))}
                    onClick={() => setSelectedSize(size)}
                    disabled={disabled}
                    aria-pressed={size === selectedSize}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex items-end justify-between gap-4">
        <p className="text-2xl text-amber-950">
          {needsVariant && !selected ? (
            <>
              <span className="text-stone-500">From </span>
              {formatWearMoney(fromCents, currency)}
            </>
          ) : (
            formatWearMoney(displayCents, currency)
          )}
        </p>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Qty</span>
          <div className="flex items-center rounded-full border border-stone-200 bg-white" role="group" aria-label="Quantity">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="inline-flex h-11 w-11 items-center justify-center text-lg text-stone-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-8 text-center text-sm font-semibold text-stone-900" aria-live="polite">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              disabled={quantity >= 99}
              aria-label="Increase quantity"
              className="inline-flex h-11 w-11 items-center justify-center text-lg text-stone-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/*
        Inline ATC is the desktop primary. On mobile (<lg) the sticky bottom bar below is the
        single primary CTA, so the inline button is hidden to avoid duplicating the same action.
        The status copy (sold out / pick color / pick size) stays visible in the reading flow.
      */}
      <div className="mt-5">
        {canAdd ? (
          <WearAddToCartButton
            productId={productId}
            productName={productName}
            unitPriceCents={displayCents}
            currency={currency}
            variantId={needsVariant ? selected?.id ?? null : null}
            contentIds={[selectedMetaContentId]}
            studioId={studioId}
            viewCartHref={viewCartHref}
            quantity={quantity}
            lineImageSrc={lineImageSrc}
            variantSummary={variantSummaryForToast}
            label={`Cop it — ${formatWearMoney(displayCents * quantity, currency)}`}
            className="hidden h-12 w-full min-h-12 items-center justify-center rounded-full border border-amber-800/50 bg-amber-950 px-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-amber-900 disabled:opacity-60 lg:inline-flex"
          />
        ) : (
          <p className="rounded-xl bg-stone-50 px-4 py-3 text-center text-sm font-medium text-stone-600">
            {soldOut ? "This piece sold out." : needsVariant && !selectedColor ? "Pick a color." : "Pick a size."}
          </p>
        )}
      </div>

      {/* Mobile sticky bottom CTA — keeps "Add to bag" reachable while user reads details. */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      >
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-amber-950">
              {needsVariant && !selected
                ? `From ${formatWearMoney(fromCents, currency)}`
                : formatWearMoney(displayCents * quantity, currency)}
            </p>
            <p className="truncate text-[11px] uppercase tracking-[0.12em] text-stone-500">
              {soldOut
                ? "Sold out"
                : needsVariant && !selectedColor
                  ? "Pick a color"
                  : needsVariant && !selectedSize
                    ? "Pick a size"
                    : `Qty ${quantity} · In stock`}
            </p>
          </div>
          {canAdd ? (
            <WearAddToCartButton
              productId={productId}
              productName={productName}
              unitPriceCents={displayCents}
              currency={currency}
              variantId={needsVariant ? selected?.id ?? null : null}
              contentIds={[selectedMetaContentId]}
              studioId={studioId}
              viewCartHref={viewCartHref}
              quantity={quantity}
              lineImageSrc={lineImageSrc}
              variantSummary={variantSummaryForToast}
              silentSuccess
              label={`Cop · ${formatWearMoney(displayCents * quantity, currency)}`}
              className="inline-flex h-12 min-h-12 shrink-0 items-center justify-center rounded-full border border-amber-800/50 bg-amber-950 px-5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-amber-900 disabled:opacity-60"
            />
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex h-12 min-h-12 shrink-0 items-center justify-center rounded-full bg-stone-200 px-5 text-sm font-semibold text-stone-500"
            >
              {soldOut ? "Sold out" : selectedColor ? "Pick a size" : "Pick a color"}
            </button>
          )}
        </div>
      </div>

      <dl className="mt-5 divide-y divide-stone-200 border-y border-stone-200 text-sm leading-6 text-stone-700">
        {[
          { k: "Fit", v: "Regular. Pick your usual size." },
          { k: "Fabric", v: "Soft cotton, heavy ink." },
          { k: "Delivery", v: "Quick turnaround — tracking by email when it ships." },
          { k: "Returns", v: "30 days, unworn." },
          { k: "Checkout", v: "Stripe · Apple Pay · Google Pay · Link." },
        ].map((row) => (
          <div key={row.k} className="flex items-baseline gap-4 py-3">
            <dt className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              {row.k}
            </dt>
            <dd>{row.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
