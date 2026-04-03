"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export function AddToCart({ productId }: { productId: string }) {
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState("");

  async function add() {
    setMsg("");
    const r = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: qty }),
    });
    const j = await r.json();
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
          value={qty}
          onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className={`${ui.input} mt-1 w-24 text-center sm:text-left`}
        />
      </div>
      <button type="button" onClick={add} className={ui.buttonPrimary}>
        Add to cart
      </button>
      {msg ? (
        <p className={`text-sm ${msg === "Added to cart" ? ui.successText : ui.errorText}`}>{msg}</p>
      ) : null}
    </div>
  );
}
