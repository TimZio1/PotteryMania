"use client";

import { useState } from "react";

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
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
        className="w-20 rounded border border-stone-300 px-2 py-2"
      />
      <button
        type="button"
        onClick={add}
        className="rounded bg-amber-800 px-6 py-2 text-white hover:bg-amber-900"
      >
        Add to cart
      </button>
      {msg && <span className="text-sm text-stone-600">{msg}</span>}
    </div>
  );
}