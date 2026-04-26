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
  studioId,
  viewCartHref,
  selectedColor: controlledSelectedColor,
  onSelectedColorChange,
}: {
  productId: string;
  basePriceCents: number;
  currency: string;
  variants: WearPdpVariant[];
  studioId?: string;
  viewCartHref?: string;
  selectedColor?: string;
  onSelectedColorChange?: (color: string) => void;
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

  const colors = useMemo(() => [...new Set(variantMeta.map((variant) => variant.color))], [variantMeta]);
  const [internalSelectedColor, setInternalSelectedColor] = useState<string>(colors[0] ?? "");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const isColorControlled = controlledSelectedColor !== undefined;
  const selectedColor = isColorControlled ? controlledSelectedColor : internalSelectedColor;

  useEffect(() => {
    trackWearEvent(WEAR_EVENT_KINDS.productView, { productId });
  }, [productId]);

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
    <div>
      {needsVariant ? (
        <div className="mt-2 space-y-5">
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

      <p className="mt-6 text-2xl text-amber-950">
        {needsVariant && !selected ? (
          <>
            <span className="text-stone-500">From </span>
            {formatWearMoney(fromCents, currency)}
          </>
        ) : (
          formatWearMoney(displayCents, currency)
        )}
      </p>

      <div className="mt-5 grid gap-2 rounded-2xl border border-amber-950/10 bg-amber-50/70 p-4 text-xs leading-5 text-stone-700 sm:grid-cols-2">
        <p>
          <strong className="text-amber-950">Fit:</strong> regular everyday fit. Pick your usual size.
        </p>
        <p>
          <strong className="text-amber-950">Fabric:</strong> soft cotton feel, printed on demand.
        </p>
        <p>
          <strong className="text-amber-950">Delivery:</strong> prints in 2-5 business days, tracking by email.
        </p>
        <p>
          <strong className="text-amber-950">Checkout:</strong> Stripe, cards, Apple Pay, Google Pay, Link.
        </p>
        <p className="sm:col-span-2">
          <strong className="text-amber-950">Returns:</strong> 30 days for unworn apparel.
        </p>
      </div>

      <div className="mt-10 hidden md:block">
        {canAdd ? (
          <WearAddToCartButton
            productId={productId}
            variantId={needsVariant ? selected?.id ?? null : null}
            studioId={studioId}
            viewCartHref={viewCartHref}
            label={`Add to bag — ${formatWearMoney(displayCents, currency)}`}
          />
        ) : (
          <p className="text-sm text-stone-500">
            {soldOut ? "This option is sold out." : needsVariant && !selectedColor ? "Pick a color to continue." : "Pick a size to continue."}
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200/90 bg-[#f7f2ec]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            {canAdd ? (
              <WearAddToCartButton
                productId={productId}
                variantId={needsVariant ? selected?.id ?? null : null}
                studioId={studioId}
                viewCartHref={viewCartHref}
                label={`Add to bag — ${formatWearMoney(displayCents, currency)}`}
                className="inline-flex h-12 w-full min-h-12 items-center justify-center rounded-full border border-amber-800/50 bg-amber-950 px-4 text-sm font-semibold tracking-wide text-white transition hover:bg-amber-900 disabled:opacity-60"
              />
            ) : (
              <p className="text-center text-xs font-medium text-stone-600">
                {soldOut ? "Sold out" : needsVariant && !selectedColor ? "Pick a color above" : "Pick a size above"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
