"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { wearListingImageSrc } from "@/lib/wear-listing-image";
import { WEAR_CURRENCY_PDP_LINE } from "@/lib/wear-currency-policy";
import { WEAR_SHIPPING_PDP_LINE } from "@/lib/wear-shipping-copy";
import { WearPdpBuySection, type WearPdpVariant } from "@/components/wear/wear-pdp-buy-section";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";

const PDP_HOOK_CLASSIC = "For makers who care how things feel — not just how they look.";

const PDP_BENEFITS_CLASSIC = [
  "Printed when you order — less waste, no stale stock.",
  "Cut and sewn for everyday wear; designed to age with you.",
  "Shipping from production close to you when possible.",
] as const;

const PDP_HOOK_APPAREL = "Soft, durable apparel — printed when you order.";

const PDP_BENEFITS_APPAREL = [
  "Pick your size and color, then check out — shipping is calculated before you pay.",
  "Printed in the EU and shipped within 2–5 business days.",
  "Secure checkout via Stripe — Apple Pay, Google Pay, and card supported.",
] as const;

const SIZE_CHART = {
  tops: [
    { size: "S", chest: "48 cm", length: "70 cm" },
    { size: "M", chest: "51 cm", length: "72 cm" },
    { size: "L", chest: "54 cm", length: "74 cm" },
    { size: "XL", chest: "57 cm", length: "76 cm" },
    { size: "2XL", chest: "60 cm", length: "78 cm" },
  ],
  hoodies: [
    { size: "S", chest: "53 cm", length: "68 cm" },
    { size: "M", chest: "56 cm", length: "70 cm" },
    { size: "L", chest: "59 cm", length: "72 cm" },
    { size: "XL", chest: "62 cm", length: "74 cm" },
    { size: "2XL", chest: "65 cm", length: "76 cm" },
  ],
} as const;

function formatEtaRange(now: Date = new Date()): string {
  const start = new Date(now.getTime());
  start.setDate(start.getDate() + 4);
  const end = new Date(now.getTime());
  end.setDate(end.getDate() + 8);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

type WearGalleryImage = {
  id: string;
  url: string;
  appearanceName: string | null;
  perspective: string | null;
};

function normalizeColorKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function wearPdpImageAlt(productName: string, image: WearGalleryImage): string {
  const bits = [productName];
  if (image.appearanceName?.trim()) bits.push(image.appearanceName.trim());
  if (image.perspective?.trim()) bits.push(image.perspective.trim());
  return bits.join(" — ");
}

export function WearProductGallery({
  productId,
  productName,
  images,
  variants,
  basePriceCents,
  currency,
  studioId,
  viewCartHref,
  backHref,
  categoryLabel,
  topSubLabel,
  subtitle,
  description,
}: {
  productId: string;
  productName: string;
  images: WearGalleryImage[];
  variants: WearPdpVariant[];
  basePriceCents: number;
  currency: string;
  studioId?: string;
  /** Defaults: `/wear/cart` or `/cart` when `studioId` is set. */
  viewCartHref?: string;
  backHref: string;
  categoryLabel: string;
  topSubLabel?: string | null;
  subtitle?: string | null;
  description?: string | null;
}) {
  const colorOptions = useMemo(
    () =>
      [...new Set(variants.map((variant) => variant.label.split(" · ")[1]?.trim() || "Default"))].filter(Boolean),
    [variants],
  );
  const [selectedColor, setSelectedColor] = useState(colorOptions[0] ?? "");
  const [selectedImageId, setSelectedImageId] = useState(images[0]?.id ?? "");

  const imagesForColor = useMemo(() => {
    if (!selectedColor) return images;
    const key = normalizeColorKey(selectedColor);
    const matching = images.filter((image) => normalizeColorKey(image.appearanceName) === key);
    return matching.length > 0 ? matching : images;
  }, [images, selectedColor]);

  useEffect(() => {
    const nextImage = imagesForColor.find((image) => image.id === selectedImageId) ?? imagesForColor[0] ?? null;
    if (nextImage && nextImage.id !== selectedImageId) {
      setSelectedImageId(nextImage.id);
    }
  }, [imagesForColor, selectedImageId]);

  const selectedImage = images.find((image) => image.id === selectedImageId) ?? imagesForColor[0] ?? null;

  const resolvedViewCartHref = viewCartHref ?? (studioId ? "/cart" : "/wear/cart");
  const apparelLaunch = isApparelOnlyLaunch();
  const pdpHook = apparelLaunch ? PDP_HOOK_APPAREL : PDP_HOOK_CLASSIC;
  const pdpBenefits = apparelLaunch ? PDP_BENEFITS_APPAREL : PDP_BENEFITS_CLASSIC;

  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
      <div>
        <div className="relative aspect-3/4 overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-100 ring-1 ring-stone-200 lg:aspect-auto lg:min-h-[min(80vh,640px)]">
          {selectedImage ? (
            <Image
              src={wearListingImageSrc(selectedImage.url, 960)}
              alt={wearPdpImageAlt(productName, selectedImage)}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              quality={78}
              priority
              fetchPriority="high"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-stone-500">
              Image coming soon
            </div>
          )}
        </div>
        {imagesForColor.length > 1 ? (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {imagesForColor.map((image) => {
              const isActive = image.id === selectedImage?.id;
              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => {
                    setSelectedImageId(image.id);
                    if (image.appearanceName) setSelectedColor(image.appearanceName);
                  }}
                  aria-pressed={isActive}
                  aria-label={`Show ${wearPdpImageAlt(productName, image)}`}
                  className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border bg-stone-100 transition sm:h-24 sm:w-20 ${
                    isActive
                      ? "border-amber-500 ring-2 ring-amber-500/40"
                      : "border-stone-200/80 hover:border-amber-300"
                  }`}
                >
                  <Image
                    src={wearListingImageSrc(image.url, 320)}
                    alt={wearPdpImageAlt(productName, image)}
                    fill
                    className="object-cover"
                    sizes="96px"
                    quality={62}
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col justify-center lg:pr-2">
        <Link
          href={backHref}
          className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500 transition hover:text-amber-950"
        >
          ← Back to shop
        </Link>
        <h1 className="mt-6 font-serif text-3xl leading-tight tracking-tight text-amber-950 sm:text-4xl">{productName}</h1>
        <p className="mt-4 text-sm font-medium leading-relaxed text-stone-700">{pdpHook}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
          {categoryLabel}
          {topSubLabel ? <> · {topSubLabel}</> : null}
        </p>
        {subtitle ? <p className="mt-3 text-lg text-stone-600">{subtitle}</p> : null}
        <ul className="mt-6 space-y-2 text-sm leading-relaxed text-stone-600">
          {pdpBenefits.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-600" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 grid gap-3 rounded-xl border border-stone-200/80 bg-stone-50/80 px-4 py-3 text-xs leading-relaxed text-stone-700 sm:grid-cols-2">
          <p className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5">📦</span>
            <span><span className="font-semibold text-amber-950">Estimated delivery:</span> {formatEtaRange()}</span>
          </p>
          <p className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5">↩</span>
            <span><span className="font-semibold text-amber-950">30-day returns</span> on defective items</span>
          </p>
          <p className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5">🔒</span>
            <span><span className="font-semibold text-amber-950">Secure checkout</span> · Apple Pay & Google Pay</span>
          </p>
          <p className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5">🌍</span>
            <span><span className="font-semibold text-amber-950">Worldwide shipping</span> from the EU</span>
          </p>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
          {WEAR_CURRENCY_PDP_LINE} See{" "}
          <Link href="/refunds" className="font-medium text-amber-950 underline underline-offset-2 hover:text-amber-900">
            refunds &amp; returns
          </Link>
          {" "}for full terms.
        </p>
        <details className="group mt-4 rounded-xl border border-stone-200/80 bg-white px-4 py-3 text-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-amber-950">
            <span className="flex items-center gap-2">
              <span aria-hidden>📏</span> Size guide
            </span>
            <span aria-hidden className="text-amber-700 transition group-open:rotate-45">+</span>
          </summary>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-stone-500">
                  <th className="pb-2 font-semibold uppercase tracking-wider">Size</th>
                  <th className="pb-2 font-semibold uppercase tracking-wider">Chest (half)</th>
                  <th className="pb-2 font-semibold uppercase tracking-wider">Length</th>
                </tr>
              </thead>
              <tbody className="text-stone-700">
                {(categoryLabel?.toLowerCase().includes("hoodie") ? SIZE_CHART.hoodies : SIZE_CHART.tops).map((row) => (
                  <tr key={row.size} className="border-t border-stone-200">
                    <td className="py-2 font-medium text-amber-950">{row.size}</td>
                    <td className="py-2">{row.chest}</td>
                    <td className="py-2">{row.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[11px] text-stone-500">
              Measurements are approximate. If between sizes, we recommend sizing up for hoodies.
            </p>
          </div>
        </details>
        <WearPdpBuySection
          productId={productId}
          basePriceCents={basePriceCents}
          currency={currency}
          variants={variants}
          studioId={studioId}
          viewCartHref={resolvedViewCartHref}
          selectedColor={selectedColor}
          onSelectedColorChange={setSelectedColor}
        />
        {description ? (
          <div className="mt-12 border-t border-stone-200/80 pt-10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Details</p>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-stone-600">{description}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
