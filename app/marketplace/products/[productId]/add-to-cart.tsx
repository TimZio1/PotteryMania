"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export function AddToCart({
  productId,
  stockQuantity,
  stockStatus,
}: {
  productId: string;
  stockQuantity: number;
  stockStatus: "in_stock" | "out_of_stock" | "backorder";
}) {
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const unavailable = stockStatus === "out_of_stock" || stockQuantity <= 0;

  async function add() {
    setMsg("");
    if (unavailable) {
      setMsg("This product is currently unavailable.");
      return;
    }
    if (qty > stockQuantity && stockStatus !== "backorder") {
      setMsg(`Only ${stockQuantity} available right now.`);
      return;
    }
    setPending(true);
    const r = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: qty }),
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
      <div>
        <label className={ui.label} htmlFor="qty">
          Quantity
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          max={stockStatus === "backorder" ? undefined : Math.max(1, stockQuantity)}
          value={qty}
          onChange={(e) => {
            const next = Math.max(1, parseInt(e.target.value, 10) || 1);
            setQty(stockStatus === "backorder" ? next : Math.min(next, Math.max(1, stockQuantity)));
          }}
          className={`${ui.input} mt-1 w-24 text-center sm:text-left`}
          disabled={unavailable || pending}
        />
      </div>
      <button type="button" onClick={add} className={ui.buttonPrimary} disabled={unavailable || pending}>
        {pending ? "Adding…" : unavailable ? "Unavailable" : "Add to cart"}
      </button>
      {stockStatus === "backorder" ? <p className="text-sm text-stone-500">Available on backorder.</p> : null}
      {msg ? (
        <p className={`text-sm ${msg === "Added to cart" ? ui.successText : ui.errorText}`}>{msg}</p>
      ) : null}
    </div>
  );
}
