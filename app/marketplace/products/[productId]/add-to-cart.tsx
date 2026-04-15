"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export function AddToCart({
  productId,
  stockQuantity,
  stockStatus,
  variants,
}: {
  productId: string;
  stockQuantity: number;
  stockStatus: "in_stock" | "out_of_stock" | "backorder";
  variants: { id: string; name: string; priceCents: number | null; stockQuantity: number | null; sortOrder: number }[];
}) {
  const [qty, setQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const hasVariants = variants.length > 0;
  const selectedVariant = hasVariants ? variants.find((row) => row.id === selectedVariantId) ?? null : null;
  const variantStock = selectedVariant?.stockQuantity ?? null;
  const unavailable = hasVariants
    ? selectedVariant == null || (variantStock != null && variantStock <= 0)
    : stockStatus === "out_of_stock" || stockQuantity <= 0;
  const maxQty = hasVariants ? (variantStock == null ? undefined : Math.max(1, variantStock)) : stockStatus === "backorder" ? undefined : Math.max(1, stockQuantity);

  async function add() {
    setMsg("");
    if (hasVariants && !selectedVariant) {
      setMsg("Please choose a variant.");
      return;
    }
    if (unavailable) {
      setMsg("This product is currently unavailable.");
      return;
    }
    if (hasVariants && variantStock != null && qty > variantStock) {
      setMsg(`Only ${variantStock} available for this variant right now.`);
      return;
    }
    if (!hasVariants && qty > stockQuantity && stockStatus !== "backorder") {
      setMsg(`Only ${stockQuantity} available right now.`);
      return;
    }
    setPending(true);
    const r = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, variantId: selectedVariant?.id ?? null, quantity: qty }),
    });
    const j = await r.json();
    setPending(false);
    if (!r.ok) {
      setMsg(j.error || "Could not add");
      return;
    }
    setMsg("Added to cart");
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {hasVariants ? (
        <div className="w-full sm:max-w-sm">
          <label className={ui.label} htmlFor="variant">
            Variant
          </label>
          <select
            id="variant"
            className={`${ui.input} mt-1`}
            value={selectedVariantId}
            onChange={(e) => {
              setSelectedVariantId(e.target.value);
              setQty(1);
            }}
            disabled={pending}
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}
                {variant.priceCents != null ? ` · €${(variant.priceCents / 100).toFixed(2)}` : ""}
                {variant.stockQuantity != null ? ` · ${variant.stockQuantity} in stock` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div>
        <label className={ui.label} htmlFor="qty">
          Quantity
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          max={maxQty}
          value={qty}
          onChange={(e) => {
            const next = Math.max(1, parseInt(e.target.value, 10) || 1);
            if (hasVariants) {
              setQty(variantStock == null ? next : Math.min(next, Math.max(1, variantStock)));
            } else {
              setQty(stockStatus === "backorder" ? next : Math.min(next, Math.max(1, stockQuantity)));
            }
          }}
          className={`${ui.input} mt-1 w-24 text-center sm:text-left`}
          disabled={unavailable || pending}
        />
      </div>
      <button type="button" onClick={add} className={ui.buttonPrimary} disabled={unavailable || pending}>
        {pending ? "Adding…" : unavailable ? "Unavailable" : "Add to cart"}
      </button>
      {!hasVariants && stockStatus === "backorder" ? <p className="text-sm text-stone-500">Available on backorder.</p> : null}
      {msg ? (
        <p className={`text-sm ${msg === "Added to cart" ? ui.successText : ui.errorText}`}>{msg}</p>
      ) : null}
    </div>
  );
}
