"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ui } from "@/lib/ui-styles";

export function StudioProductAddToCart({
  productId,
  checkoutEnabled,
  variants,
  studioThemed = false,
}: {
  productId: string;
  checkoutEnabled: boolean;
  variants?: { id: string; name: string; priceCents: number | null; stockQuantity: number | null; sortOrder: number }[];
  /** When true, buttons inherit curated studio CSS (public `/studios/:id` only). */
  studioThemed?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState(variants?.[0]?.id ?? "");
  const hasVariants = (variants?.length ?? 0) > 0;
  const selectedVariant = hasVariants ? variants?.find((row) => row.id === selectedVariantId) ?? null : null;
  const variantUnavailable =
    hasVariants && selectedVariant ? selectedVariant.stockQuantity != null && selectedVariant.stockQuantity <= 0 : false;

  useEffect(() => {
    if (!hasVariants) {
      setSelectedVariantId("");
      return;
    }
    setSelectedVariantId((current) => {
      if (current && variants?.some((variant) => variant.id === current)) return current;
      return variants?.[0]?.id ?? "";
    });
  }, [hasVariants, variants]);

  async function add() {
    if (!checkoutEnabled) return;
    if (hasVariants && !selectedVariant) {
      setMsg({ type: "err", text: "Choose a variant first." });
      return;
    }
    if (variantUnavailable) {
      setMsg({ type: "err", text: "This variant is currently unavailable." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId: selectedVariant?.id ?? null, quantity: 1 }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ type: "err", text: typeof j.error === "string" ? j.error : "Could not add to cart" });
        return;
      }
      setMsg({ type: "ok", text: "Added to your cart" });
    } finally {
      setBusy(false);
    }
  }

  if (!checkoutEnabled) {
    return (
      <p className={studioThemed ? "st-muted text-xs" : "text-xs text-stone-500"}>
        Checkout is temporarily unavailable for the shop.
      </p>
    );
  }

  return (
    <div className="mt-3">
      {hasVariants ? (
        <label className="mb-2 block">
          <span className={studioThemed ? "st-muted text-xs" : ui.label}>Variant</span>
          <select
            className={studioThemed ? "st-input mt-1 w-full text-sm" : `${ui.input} mt-1 w-full text-sm`}
            value={selectedVariantId}
            onChange={(e) => setSelectedVariantId(e.target.value)}
            disabled={busy}
          >
            {(variants ?? []).map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}
                {variant.priceCents != null ? ` · €${(variant.priceCents / 100).toFixed(2)}` : ""}
                {variant.stockQuantity != null ? ` · ${variant.stockQuantity} in stock` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        onClick={add}
        disabled={busy || variantUnavailable}
        className={studioThemed ? "st-btn-primary w-full text-sm" : `${ui.buttonPrimary} w-full text-sm`}
      >
        {busy ? "Adding…" : variantUnavailable ? "Unavailable" : "Add to cart"}
      </button>
      {msg ? (
        <p
          className={`mt-2 text-xs ${
            studioThemed
              ? msg.type === "ok"
                ? "text-emerald-700"
                : "text-red-700"
              : msg.type === "ok"
                ? ui.successText
                : ui.errorText
          }`}
        >
          {msg.text}{" "}
          {msg.type === "ok" ? (
            <Link href="/cart" className={studioThemed ? "st-link font-medium" : "font-medium underline underline-offset-2"}>
              View cart
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
