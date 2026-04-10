"use client";

import Link from "next/link";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export function StudioProductAddToCart({
  productId,
  checkoutEnabled,
  studioThemed = false,
}: {
  productId: string;
  checkoutEnabled: boolean;
  /** When true, buttons inherit curated studio CSS (public `/studios/:id` only). */
  studioThemed?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function add() {
    if (!checkoutEnabled) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
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
      <button
        type="button"
        onClick={add}
        disabled={busy}
        className={studioThemed ? "st-btn-primary w-full text-sm" : `${ui.buttonPrimary} w-full text-sm`}
      >
        {busy ? "Adding…" : "Add to cart"}
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
