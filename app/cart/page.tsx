"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { depositChargedCents } from "@/lib/bookings/deposit";
import { seatTypeKeysFromSlot } from "@/lib/bookings/seat-type";

type Item = {
  id: string;
  itemType: "product" | "booking";
  quantity: number;
  participantCount?: number | null;
  seatType?: string | null;
  priceSnapshotCents: number;
  product?: { title: string; images: { imageUrl: string }[] } | null;
  experience?: { title: string; bookingDepositBps: number } | null;
  slot?: {
    slotDate: string;
    startTime: string;
    endTime: string;
    seatCapacities?: unknown;
  } | null;
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

  async function updateParticipants(itemId: string, participantCount: number) {
    await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, participantCount }),
    });
    load();
  }

  async function updateSeatType(itemId: string, seatType: string) {
    await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, seatType }),
    });
    load();
  }

  function lineDueCents(i: Item): number {
    if (i.itemType === "product") return i.priceSnapshotCents * i.quantity;
    const p = i.participantCount ?? 0;
    const full = i.priceSnapshotCents * p;
    const bps = i.experience?.bookingDepositBps ?? 0;
    return depositChargedCents(full, bps);
  }

  function lineDisplayFullCents(i: Item): number {
    if (i.itemType === "product") return i.priceSnapshotCents * i.quantity;
    return i.priceSnapshotCents * (i.participantCount ?? 0);
  }

  const sub = items.reduce((s, i) => s + lineDueCents(i), 0) / 100;
  const hasProducts = items.some((i) => i.itemType === "product");

  if (loading) return <div className="p-8">Loading cart…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/marketplace" className="text-amber-800">
          ← Marketplace
        </Link>
        <Link href="/classes" className="text-amber-800">
          Browse classes
        </Link>
      </div>
      <h1 className="mt-4 text-2xl font-semibold text-amber-950">Cart</h1>
      {items.length === 0 ? (
        <p className="mt-6 text-stone-500">Your cart is empty.</p>
      ) : (
        <>
          <ul className="mt-6 space-y-4">
            {items.map((i) => {
              const seatKeys = i.itemType === "booking" ? seatTypeKeysFromSlot(i.slot?.seatCapacities) : [];
              const fullEur = (lineDisplayFullCents(i) / 100).toFixed(2);
              const dueEur = (lineDueCents(i) / 100).toFixed(2);
              const hasDeposit =
                i.itemType === "booking" && (i.experience?.bookingDepositBps ?? 0) > 0 && lineDueCents(i) < lineDisplayFullCents(i);

              return (
                <li key={i.id} className="border-b border-stone-200 py-3">
                  <div className="flex justify-between gap-2">
                    <span>
                      {i.itemType === "product" ? i.product?.title : i.experience?.title}
                      {i.itemType === "booking" && i.slot ? (
                        <span className="block text-xs text-stone-500">
                          {i.slot.slotDate.slice(0, 10)} {i.slot.startTime}–{i.slot.endTime}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                      {i.itemType === "product" ? (
                        <input
                          type="number"
                          min={1}
                          className="w-16 rounded border px-1"
                          value={i.quantity}
                          onChange={(e) => updateQty(i.id, parseInt(e.target.value, 10) || 1)}
                        />
                      ) : (
                        <input
                          type="number"
                          min={1}
                          className="w-16 rounded border px-1"
                          value={i.participantCount ?? 1}
                          onChange={(e) => updateParticipants(i.id, parseInt(e.target.value, 10) || 1)}
                        />
                      )}
                      <span className="text-sm">
                        {i.itemType === "booking" && hasDeposit ? (
                          <>
                            Total €{fullEur}
                            <span className="block text-xs text-stone-500">Due now €{dueEur}</span>
                          </>
                        ) : (
                          <>€{dueEur}</>
                        )}
                      </span>
                    </span>
                  </div>
                  {seatKeys.length > 0 && (
                    <label className="mt-2 block text-xs text-stone-600">
                      Seat type
                      <select
                        className="mt-1 w-full max-w-xs rounded border px-2 py-1"
                        value={i.seatType ?? ""}
                        onChange={(e) => updateSeatType(i.id, e.target.value)}
                      >
                        <option value="">Select…</option>
                        {seatKeys.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-right text-sm text-stone-600">
            Charged at checkout (Stripe) <span className="font-medium text-stone-900">€{sub.toFixed(2)}</span>
          </p>

          <div className="mt-10 space-y-3 border-t border-stone-200 pt-8">
            <h2 className="font-medium">Checkout</h2>
            {err && <p className="text-sm text-red-600">{err}</p>}
            {!hasProducts ? (
              <p className="text-sm text-stone-500">Booking-only orders skip shipping; name and email are still required.</p>
            ) : null}
            <input className="w-full rounded border px-3 py-2" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="w-full rounded border px-3 py-2" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {hasProducts ? (
              <>
                <input className="w-full rounded border px-3 py-2" placeholder="Address line 1" value={line1} onChange={(e) => setLine1(e.target.value)} />
                <input className="w-full rounded border px-3 py-2" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                <input className="w-full rounded border px-3 py-2" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </>
            ) : null}
            <button type="button" onClick={checkout} className="mt-4 w-full rounded bg-amber-800 py-3 text-white">
              Pay with Stripe
            </button>
          </div>
        </>
      )}
    </div>
  );
}
