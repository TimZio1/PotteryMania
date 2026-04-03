"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { depositChargedCents } from "@/lib/bookings/deposit";
import { seatTypeKeysFromSlot } from "@/lib/bookings/seat-type";
import { ui } from "@/lib/ui-styles";

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

export function CartContents() {
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

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-sm text-stone-500">Loading your cart…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/marketplace" className="font-medium text-amber-900 hover:underline">
          ← Shop
        </Link>
        <Link href="/classes" className="font-medium text-amber-900 hover:underline">
          Browse classes
        </Link>
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-amber-950">Cart</h1>
      <p className="mt-2 text-sm text-stone-600">Review items, then pay securely with Stripe.</p>

      {items.length === 0 ? (
        <div className={`${ui.cardMuted} mt-10`}>
          <p className="font-medium text-stone-800">Your cart is empty</p>
          <p className="mt-2 text-sm text-stone-600">
            <Link href="/marketplace" className="font-medium text-amber-900 underline underline-offset-2">
              Browse the marketplace
            </Link>{" "}
            or{" "}
            <Link href="/classes" className="font-medium text-amber-900 underline underline-offset-2">
              book a class
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-8 space-y-4">
            {items.map((i) => {
              const seatKeys = i.itemType === "booking" ? seatTypeKeysFromSlot(i.slot?.seatCapacities) : [];
              const fullEur = (lineDisplayFullCents(i) / 100).toFixed(2);
              const dueEur = (lineDueCents(i) / 100).toFixed(2);
              const hasDeposit =
                i.itemType === "booking" &&
                (i.experience?.bookingDepositBps ?? 0) > 0 &&
                lineDueCents(i) < lineDisplayFullCents(i);

              return (
                <li
                  key={i.id}
                  className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-900">
                        {i.itemType === "product" ? i.product?.title : i.experience?.title}
                      </p>
                      {i.itemType === "booking" && i.slot ? (
                        <p className="mt-1 text-xs text-stone-500">
                          {i.slot.slotDate.slice(0, 10)} · {i.slot.startTime}–{i.slot.endTime}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-row items-center justify-between gap-4 sm:flex-col sm:items-end">
                      {i.itemType === "product" ? (
                        <input
                          type="number"
                          min={1}
                          className="min-h-10 w-20 rounded-xl border border-stone-200 px-2 text-center text-sm"
                          value={i.quantity}
                          onChange={(e) => updateQty(i.id, parseInt(e.target.value, 10) || 1)}
                          aria-label="Quantity"
                        />
                      ) : (
                        <input
                          type="number"
                          min={1}
                          className="min-h-10 w-20 rounded-xl border border-stone-200 px-2 text-center text-sm"
                          value={i.participantCount ?? 1}
                          onChange={(e) => updateParticipants(i.id, parseInt(e.target.value, 10) || 1)}
                          aria-label="Participants"
                        />
                      )}
                      <div className="text-right text-sm">
                        {i.itemType === "booking" && hasDeposit ? (
                          <>
                            <span className="font-medium text-stone-900">Total €{fullEur}</span>
                            <span className="mt-0.5 block text-xs text-stone-500">Due now €{dueEur}</span>
                          </>
                        ) : (
                          <span className="font-medium text-stone-900">€{dueEur}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {seatKeys.length > 0 && (
                    <label className="mt-4 block">
                      <span className={ui.label}>Seat type</span>
                      <select
                        className={`${ui.input} mt-1 max-w-xs`}
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
          <p className="mt-6 text-right text-sm text-stone-600">
            Charged at checkout{" "}
            <span className="text-base font-semibold text-amber-950">€{sub.toFixed(2)}</span>
          </p>

          <div className="mt-10 border-t border-stone-200 pt-10">
            <h2 className="text-lg font-semibold text-amber-950">Checkout details</h2>
            <p className="mt-1 text-sm text-stone-600">We use these details for your Stripe receipt and shipping when applicable.</p>
            {err ? <p className={`${ui.errorText} mt-4`}>{err}</p> : null}
            {!hasProducts ? (
              <p className="mt-4 text-sm text-stone-500">Booking-only: no shipping address needed. Name and email are required.</p>
            ) : null}
            <div className="mt-6 space-y-4">
              <div>
                <label className={ui.label} htmlFor="cart-name">
                  Full name
                </label>
                <input
                  id="cart-name"
                  className={`${ui.input} mt-1`}
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className={ui.label} htmlFor="cart-email">
                  Email
                </label>
                <input
                  id="cart-email"
                  className={`${ui.input} mt-1`}
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              {hasProducts ? (
                <>
                  <div>
                    <label className={ui.label} htmlFor="cart-line1">
                      Address
                    </label>
                    <input
                      id="cart-line1"
                      className={`${ui.input} mt-1`}
                      placeholder="Street and number"
                      value={line1}
                      onChange={(e) => setLine1(e.target.value)}
                      autoComplete="address-line1"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={ui.label} htmlFor="cart-city">
                        City
                      </label>
                      <input
                        id="cart-city"
                        className={`${ui.input} mt-1`}
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={ui.label} htmlFor="cart-country">
                        Country
                      </label>
                      <input
                        id="cart-country"
                        className={`${ui.input} mt-1`}
                        placeholder="Country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        autoComplete="country-name"
                      />
                    </div>
                  </div>
                </>
              ) : null}
              <button type="button" onClick={checkout} className={`${ui.buttonPrimary} mt-2 w-full`}>
                Continue to payment
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
