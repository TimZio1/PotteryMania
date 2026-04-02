"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  quantity: number;
  priceSnapshotCents: number;
  product: { title: string; images: { imageUrl: string }[] };
};

export default function CartPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const r = await fetch("/api/cart");
    const j = await r.json();
    setItems(j.cart?.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateQty(itemId: string, quantity: number) {
    await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity }),
    });
    load();
  }

  async function checkout() {
    setErr("");
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name,
        customerEmail: email,
        shippingAddress: { line1, city, country },
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error || "Checkout failed");
      return;
    }
    if (j.url) window.location.href = j.url;
  }

  const sub = items.reduce((s, i) => s + i.priceSnapshotCents * i.quantity, 0) / 100;

  if (loading) return <div className="p-8">Loading cart…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/marketplace" className="text-sm text-amber-800">
        ← Continue shopping
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-amber-950">Cart</h1>
      {items.length === 0 ? (
        <p className="mt-6 text-stone-500">Your cart is empty.</p>
      ) : (
        <>
          <ul className="mt-6 space-y-4">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between border-b border-stone-200 py-3">
                <span>{i.product.title}</span>
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    className="w-16 rounded border px-1"
                    value={i.quantity}
                    onChange={(e) => updateQty(i.id, parseInt(e.target.value, 10) || 1)}
                  />
                  <span>€{((i.priceSnapshotCents * i.quantity) / 100).toFixed(2)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-right font-medium">Subtotal €{sub.toFixed(2)}</p>

          <div className="mt-10 space-y-3 border-t border-stone-200 pt-8">
            <h2 className="font-medium">Checkout</h2>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <input className="w-full rounded border px-3 py-2" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="w-full rounded border px-3 py-2" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="w-full rounded border px-3 py-2" placeholder="Address line 1" value={line1} onChange={(e) => setLine1(e.target.value)} />
            <input className="w-full rounded border px-3 py-2" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <input className="w-full rounded border px-3 py-2" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
            <button type="button" onClick={checkout} className="mt-4 w-full rounded bg-amber-800 py-3 text-white">
              Pay with Stripe
            </button>
          </div>
        </>
      )}
    </div>
  );
}