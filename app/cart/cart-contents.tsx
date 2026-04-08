"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { depositChargedCents } from "@/lib/bookings/deposit";
import { seatTypeKeysFromSlot } from "@/lib/bookings/seat-type";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ui } from "@/lib/ui-styles";

type Item = {
  id: string;
  vendorId: string;
  vendor?: { id: string; displayName: string } | null;
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

type CouponPreview = {
  code: string;
  name: string | null;
  subtotalBefore: number;
  discountCents: number;
  subtotalAfter: number;
  shippingCents: number;
  taxCents: number;
  estimatedTotal: number;
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
  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [couponErr, setCouponErr] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const cartSigRef = useRef("");

  async function load() {
    const r = await fetch("/api/cart");
    const j = await r.json();
    const next: Item[] = j.cart?.items || [];
    const sig = next
      .map((i) => `${i.id}:${i.quantity}:${i.participantCount ?? ""}:${i.seatType ?? ""}`)
      .join("|");
    if (cartSigRef.current !== "" && cartSigRef.current !== sig) {
      setCouponPreview(null);
      setAppliedCode("");
      setCouponErr("");
    }
    cartSigRef.current = sig;
    setItems(next);
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

  const vendorGroups = useMemo(() => {
    const m = new Map<string, { studioId: string; displayName: string; items: Item[] }>();
    for (const i of items) {
      const vid = i.vendorId || i.vendor?.id;
      if (!vid) continue;
      const displayName = i.vendor?.displayName?.trim() || "Studio";
      const g = m.get(vid) ?? { studioId: vid, displayName, items: [] };
      g.items.push(i);
      m.set(vid, g);
    }
    return [...m.values()];
  }, [items]);

  const multiVendor = vendorGroups.length > 1;

  useEffect(() => {
    if (!multiVendor) return;
    setCouponPreview(null);
    setAppliedCode("");
    setCouponErr("");
  }, [multiVendor]);

  async function applyPromo() {
    if (multiVendor) {
      setCouponErr("Promo codes apply to one studio at a time. Check out each studio separately, or empty the cart to a single studio first.");
      return;
    }
    setCouponErr("");
    setCouponBusy(true);
    const singleStudioId = vendorGroups[0]?.studioId;
    const r = await fetch("/api/coupon/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: promoInput.trim(),
        shippingAddress: { line1, city, country },
        ...(singleStudioId ? { studioId: singleStudioId } : {}),
      }),
    });
    const j = await r.json().catch(() => ({}));
    setCouponBusy(false);
    if (!r.ok) {
      setCouponPreview(null);
      setAppliedCode("");
      setCouponErr(typeof j.error === "string" ? j.error : "Could not apply code");
      return;
    }
    setCouponPreview(j as CouponPreview);
    setAppliedCode(j.code);
  }

  function clearPromo() {
    setCouponPreview(null);
    setAppliedCode("");
    setCouponErr("");
  }

  const [checkoutBusy, setCheckoutBusy] = useState(false);

  async function checkout(studioScopeId?: string) {
    if (checkoutBusy) return;
    setCheckoutBusy(true);
    setErr("");
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name,
        customerEmail: email,
        shippingAddress: { line1, city, country },
        ...(studioScopeId ? { studioId: studioScopeId } : {}),
        ...(!multiVendor && appliedCode ? { couponCode: appliedCode } : {}),
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setCheckoutBusy(false);
      if (r.status === 409 && j?.priceChanged) {
        setErr("Prices were updated — refresh your cart and review line totals, then try again.");
        load();
        return;
      }
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
      <div className="mx-auto max-w-2xl py-10" role="status" aria-busy="true" aria-label="Loading cart">
        <div className={`${ui.card} space-y-4`}>
          <div className="flex items-center gap-3">
            <Spinner />
            <Skeleton className="h-5 w-40" />
          </div>
          <SkeletonText lines={3} />
        </div>
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
      {multiVendor ? (
        <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          Your cart includes <strong>more than one studio</strong>. Each studio is paid out separately via Stripe Connect, so you will complete{" "}
          <strong>one secure checkout per studio</strong>. After paying for the first, return here to pay the rest.
        </p>
      ) : null}

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
          <div className="mt-8 space-y-8">
            {vendorGroups.map((group) => (
              <section key={group.studioId}>
                {multiVendor ? (
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
                    {group.displayName}
                  </h2>
                ) : null}
                <ul className="space-y-4">
                  {group.items.map((i) => {
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
                    <div className="flex min-w-0 gap-4">
                      {i.itemType === "product" ? (
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                          {i.product?.images[0]?.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={i.product.images[0].imageUrl}
                              alt={i.product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[11px] text-stone-400">
                              No image
                            </div>
                          )}
                        </div>
                      ) : null}
                      <div className="min-w-0">
                      {!multiVendor && i.vendor?.displayName ? (
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{i.vendor.displayName}</p>
                      ) : null}
                      <p className="font-medium text-stone-900">
                        {i.itemType === "product" ? i.product?.title : i.experience?.title}
                      </p>
                      {i.itemType === "booking" && i.slot ? (
                        <p className="mt-1 text-xs text-stone-500">
                          {i.slot.slotDate.slice(0, 10)} · {i.slot.startTime}–{i.slot.endTime}
                        </p>
                      ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-row items-center justify-between gap-4 sm:flex-col sm:items-end">
                      {i.itemType === "product" ? (
                        <input
                          type="number"
                          min={1}
                          className="min-h-11 w-20 rounded-xl border border-stone-200 px-2 text-center text-sm"
                          value={i.quantity}
                          onChange={(e) => updateQty(i.id, parseInt(e.target.value, 10) || 1)}
                          aria-label="Quantity"
                        />
                      ) : (
                        <input
                          type="number"
                          min={1}
                          className="min-h-11 w-20 rounded-xl border border-stone-200 px-2 text-center text-sm"
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
                    <div className="mt-4">
                      <label className={ui.label} htmlFor={`seat-type-${i.id}`}>Seat type</label>
                      <select
                        id={`seat-type-${i.id}`}
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
                    </div>
                  )}
                </li>
              );
                  })}
                </ul>
              </section>
            ))}
          </div>
          <div className="mt-6 space-y-1 text-right text-sm text-stone-600">
            <p>
              Subtotal (due now){" "}
              <span className="text-base font-semibold text-amber-950">€{sub.toFixed(2)}</span>
            </p>
            {couponPreview ? (
              <>
                <p>
                  Discount ({couponPreview.code}
                  {couponPreview.name ? ` — ${couponPreview.name}` : ""}){" "}
                  <span className="font-semibold text-emerald-800">
                    −€{(couponPreview.discountCents / 100).toFixed(2)}
                  </span>
                </p>
                <p>
                  After discount{" "}
                  <span className="text-base font-semibold text-amber-950">
                    €{(couponPreview.subtotalAfter / 100).toFixed(2)}
                  </span>
                </p>
                {hasProducts ? (
                  <>
                    <p className="text-xs text-stone-500">
                      Est. shipping €{(couponPreview.shippingCents / 100).toFixed(2)} · Est. tax €
                      {(couponPreview.taxCents / 100).toFixed(2)}
                    </p>
                    <p>
                      Est. total{" "}
                      <span className="text-base font-semibold text-amber-950">
                        €{(couponPreview.estimatedTotal / 100).toFixed(2)}
                      </span>
                    </p>
                  </>
                ) : (
                  <p>
                    Estimated total at checkout{" "}
                    <span className="text-base font-semibold text-amber-950">
                      €{(couponPreview.estimatedTotal / 100).toFixed(2)}
                    </span>
                  </p>
                )}
              </>
            ) : null}
          </div>

          <div className="mt-10 border-t border-stone-200 pt-10">
            <h2 className="text-lg font-semibold text-amber-950">Checkout details</h2>
            <p className="mt-1 text-sm text-stone-600">We use these details for your Stripe receipt and shipping when applicable.</p>
            {err ? <p className={`${ui.errorText} mt-4`}>{err}</p> : null}
            {couponErr ? <p className={`${ui.errorText} mt-2`}>{couponErr}</p> : null}
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
              <div className="rounded-2xl border border-stone-200/90 bg-stone-50/50 p-4">
                <label className={ui.label} htmlFor="cart-promo">
                  Promo code
                </label>
                {multiVendor ? (
                  <p className="mt-2 text-sm text-stone-600">
                    Promo codes apply to a single studio checkout. Use a code after your cart only contains items from one studio, or apply it on each studio&apos;s checkout one at a time.
                  </p>
                ) : (
                  <>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        id="cart-promo"
                        className={`${ui.input} sm:min-w-0 sm:flex-1`}
                        placeholder="Enter code"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        autoComplete="off"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={couponBusy || !promoInput.trim()}
                          onClick={applyPromo}
                          className={ui.buttonSecondary}
                        >
                          Apply
                        </button>
                        {appliedCode ? (
                          <button type="button" onClick={clearPromo} className={ui.buttonGhost}>
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-stone-500">
                      {hasProducts
                        ? "Shipping and tax estimates use your address above."
                        : "Discount applies to class deposits in this cart."}
                    </p>
                  </>
                )}
              </div>
              {multiVendor ? (
                <div className="mt-4 space-y-3">
                  {vendorGroups.map((g) => (
                    <div key={g.studioId} className="space-y-2">
                      <button
                        type="button"
                        disabled={checkoutBusy}
                        onClick={() => checkout(g.studioId)}
                        className={`${ui.buttonPrimary} w-full`}
                      >
                        {checkoutBusy ? (
                          <span className="inline-flex items-center gap-2"><Spinner size="sm" className="text-white" /> Processing…</span>
                        ) : (
                          <>Continue to payment — {g.displayName}</>
                        )}
                      </button>
                      <p className="flex items-center justify-center gap-2 text-xs text-stone-500">
                        <span aria-hidden="true">🔒</span>
                        Secure Stripe checkout
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <button type="button" disabled={checkoutBusy} onClick={() => checkout()} className={`${ui.buttonPrimary} mt-2 w-full`}>
                    {checkoutBusy ? (
                      <span className="inline-flex items-center gap-2"><Spinner size="sm" className="text-white" /> Processing…</span>
                    ) : (
                      "Continue to payment"
                    )}
                  </button>
                  <p className="flex items-center justify-center gap-2 text-xs text-stone-500">
                    <span aria-hidden="true">🔒</span>
                    Secure Stripe checkout
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
