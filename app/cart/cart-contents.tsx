"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { bookingAllowsFullPaymentOption, bookingChargeNowCents, normalizeBookingPaymentPreference } from "@/lib/bookings/deposit";
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
  classPackagePurchaseId?: string | null;
  notes?: string | null;
  addOnSelections?: { addOnId: string; name: string; quantity: number; unitPriceCents: number }[] | null;
  intakeResponsePayload?: { formId: string; label: string; value: string; includeInInvoice: boolean }[] | null;
  priceSnapshotCents: number;
  bookingPaymentPreference?: "deposit" | "full" | null;
  product?: { title: string; images: { imageUrl: string }[] } | null;
  experience?: { title: string; bookingDepositBps: number; allowFullPaymentOption?: boolean } | null;
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
  paymentMethod?: "coupon" | "gift_card";
  subtotalBefore: number;
  discountCents: number;
  subtotalAfter: number;
  shippingCents: number;
  taxCents: number;
  estimatedTotal: number;
};

export function CartContents() {
  const searchParams = useSearchParams();
  const wasCancelled = searchParams.get("cancelled") === "1";
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartError, setCartError] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [err, setErr] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [giftCardInput, setGiftCardInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [appliedMethod, setAppliedMethod] = useState<"coupon" | "gift_card" | null>(null);
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [couponErr, setCouponErr] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const cartSigRef = useRef("");

  async function load() {
    try {
      const r = await fetch("/api/cart");
      if (!r.ok) {
        setCartError(true);
        setLoading(false);
        return;
      }
      const j = await r.json();
      const next: Item[] = j.cart?.items || [];
      const sig = next
        .map((i) => `${i.id}:${i.quantity}:${i.participantCount ?? ""}:${i.seatType ?? ""}:${i.priceSnapshotCents}:${(i.addOnSelections ?? []).map((selection) => `${selection.addOnId}:${selection.quantity}`).join(",")}`)
        .join("|");
      if (cartSigRef.current !== "" && cartSigRef.current !== sig) {
        setCouponPreview(null);
        setAppliedCode("");
        setAppliedMethod(null);
        setCouponErr("");
      }
      cartSigRef.current = sig;
      setCartError(false);
      setItems(next);
    } catch {
      setCartError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function mutateCart(body: Record<string, unknown>) {
    const res = await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({} as { error?: string }));
      throw new Error(payload.error || "Could not update cart");
    }
  }

  async function updateQty(itemId: string, quantity: number) {
    setErr("");
    try {
      await mutateCart({ itemId, quantity });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not update cart");
    }
  }

  async function removeItem(itemId: string, itemType: "product" | "booking") {
    setErr("");
    try {
      await mutateCart({ itemId, ...(itemType === "product" ? { quantity: 0 } : { participantCount: 0 }) });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not update cart");
    }
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
    setAppliedMethod(null);
    setCouponErr("");
  }, [multiVendor]);

  async function applyAdjustment(method: "coupon" | "gift_card") {
    if (multiVendor) {
      setCouponErr("Promo codes apply to one studio at a time. Check out each studio separately, or empty the cart to a single studio first.");
      return;
    }
    const code = method === "gift_card" ? giftCardInput.trim() : promoInput.trim();
    if (!code) return;
    setCouponErr("");
    setCouponBusy(true);
    const singleStudioId = vendorGroups[0]?.studioId;
    const r = await fetch("/api/coupon/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        paymentMethod: method,
        shippingAddress: { line1, city, country },
        ...(singleStudioId ? { studioId: singleStudioId } : {}),
      }),
    });
    const j = await r.json().catch(() => ({}));
    setCouponBusy(false);
    if (!r.ok) {
      setCouponPreview(null);
      setAppliedCode("");
      setAppliedMethod(null);
      setCouponErr(typeof j.error === "string" ? j.error : "Could not apply code");
      return;
    }
    setCouponPreview(j as CouponPreview);
    setAppliedCode(j.code);
    setAppliedMethod(method);
  }

  function clearPromo() {
    setCouponPreview(null);
    setAppliedCode("");
    setAppliedMethod(null);
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
        notes: generalNotes.trim() || undefined,
        ...(studioScopeId ? { studioId: studioScopeId } : {}),
        ...(!multiVendor && appliedCode && appliedMethod === "coupon" ? { couponCode: appliedCode } : {}),
        ...(!multiVendor && appliedCode && appliedMethod === "gift_card" ? { giftCardCode: appliedCode } : {}),
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
    setErr("");
    try {
      await mutateCart({ itemId, participantCount });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not update cart");
    }
  }

  async function updateSeatType(itemId: string, seatType: string) {
    setErr("");
    try {
      await mutateCart({ itemId, seatType });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not update cart");
    }
  }

  async function updateBookingNotes(itemId: string, notes: string) {
    setErr("");
    try {
      await mutateCart({ itemId, notes });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not update cart");
    }
  }

  async function updateBookingPaymentPreference(itemId: string, bookingPaymentPreference: "deposit" | "full") {
    setErr("");
    try {
      await mutateCart({ itemId, bookingPaymentPreference });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not update cart");
    }
  }

  async function updatePackageCredit(itemId: string, classPackagePurchaseId: string | null) {
    setErr("");
    try {
      await mutateCart({ itemId, classPackagePurchaseId });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not update cart");
    }
  }

  function effectiveBookingPaymentPreference(i: Item): "deposit" | "full" {
    return normalizeBookingPaymentPreference(i.bookingPaymentPreference ?? undefined, {
      bookingDepositBps: i.experience?.bookingDepositBps ?? 0,
      allowFullPaymentOption: i.experience?.allowFullPaymentOption ?? false,
    });
  }

  function lineDueCents(i: Item): number {
    if (i.itemType === "product") return i.priceSnapshotCents * i.quantity;
    const p = i.participantCount ?? 0;
    const addOnsTotal =
      i.addOnSelections?.reduce((sum, selection) => sum + selection.unitPriceCents * selection.quantity, 0) ?? 0;
    if (i.classPackagePurchaseId) {
      return addOnsTotal;
    }
    const full = i.priceSnapshotCents * p + addOnsTotal;
    return bookingChargeNowCents(
      full,
      {
        bookingDepositBps: i.experience?.bookingDepositBps ?? 0,
        allowFullPaymentOption: i.experience?.allowFullPaymentOption ?? false,
      },
      effectiveBookingPaymentPreference(i),
    );
  }

  function lineDisplayFullCents(i: Item): number {
    if (i.itemType === "product") return i.priceSnapshotCents * i.quantity;
    const addOnsTotal =
      i.addOnSelections?.reduce((sum, selection) => sum + selection.unitPriceCents * selection.quantity, 0) ?? 0;
    return i.priceSnapshotCents * (i.participantCount ?? 0) + addOnsTotal;
  }

  const sub = items.reduce((s, i) => s + lineDueCents(i), 0) / 100;
  const hasProducts = items.some((i) => i.itemType === "product");

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-[var(--pm-space-10)]" role="status" aria-busy="true" aria-label="Loading cart">
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
        <button
          type="button"
          onClick={() => window.history.back()}
          className="font-medium text-[var(--accent)] hover:underline"
        >
          ← Back
        </button>
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Cart</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Review items, then pay securely with Stripe.</p>
      {wasCancelled && (
        <div className="mt-4 rounded-xl border border-[var(--accent)]/80 bg-[var(--accent-muted)]/90 p-4 text-sm text-[var(--foreground)]">
          Payment was cancelled — your cart is still here. Continue when you&apos;re ready.
        </div>
      )}
      {cartError && (
        <div className="mt-4 rounded-xl border border-red-800/40 bg-red-950/30 p-4 text-sm text-red-900">
          Could not load your cart. Please refresh the page or try again in a moment.
        </div>
      )}
      {multiVendor ? (
        <p className="mt-4 rounded-[length:var(--pm-radius-card)] border border-[var(--accent)]/80 bg-[var(--accent-muted)]/90 p-[var(--pm-space-4)] text-sm text-[var(--foreground)]">
          Your cart includes <strong>more than one studio</strong>. Each studio is paid out separately via Stripe Connect, so you will complete{" "}
          <strong>one secure checkout per studio</strong>. After paying for the first, return here to pay the rest.
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className={`${ui.cardMuted} mt-10`}>
          <p className="font-medium text-[var(--foreground)]">Your cart is empty</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Visit a studio page to browse their classes and products.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-8">
            {vendorGroups.map((group) => (
              <section key={group.studioId}>
                {multiVendor ? (
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
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
                !i.classPackagePurchaseId &&
                (i.experience?.bookingDepositBps ?? 0) > 0 &&
                lineDueCents(i) < lineDisplayFullCents(i);

              return (
                <li key={i.id} className={`${ui.card} !p-[var(--pm-space-4)] sm:!p-[var(--pm-space-5)]`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <div className="flex min-w-0 gap-4">
                      {i.itemType === "product" ? (
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[length:var(--pm-radius-control)] bg-[var(--surface-elevated)]">
                          {i.product?.images[0]?.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={i.product.images[0].imageUrl}
                              alt={i.product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[11px] text-[var(--muted)]">
                              No image
                            </div>
                          )}
                        </div>
                      ) : null}
                      <div className="min-w-0">
                      {!multiVendor && i.vendor?.displayName ? (
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{i.vendor.displayName}</p>
                      ) : null}
                      <p className="font-medium text-[var(--foreground)]">
                        {i.itemType === "product" ? i.product?.title : i.experience?.title}
                      </p>
                      {i.itemType === "booking" && i.classPackagePurchaseId ? (
                        <p className="mt-1 text-xs font-medium text-emerald-700">Package credit applied</p>
                      ) : null}
                      {i.itemType === "booking" && i.slot ? (
                        <p className="mt-1 text-xs text-[var(--muted)]">
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
                          className="min-h-11 w-20 rounded-[length:var(--pm-radius-control)] border border-[var(--border)] px-2 text-center text-sm shadow-[var(--pm-shadow-rest)]"
                          value={i.quantity}
                          onChange={(e) => updateQty(i.id, parseInt(e.target.value, 10) || 1)}
                          aria-label="Quantity"
                        />
                      ) : (
                        <input
                          type="number"
                          min={1}
                          className="min-h-11 w-20 rounded-[length:var(--pm-radius-control)] border border-[var(--border)] px-2 text-center text-sm shadow-[var(--pm-shadow-rest)]"
                          value={i.participantCount ?? 1}
                          onChange={(e) => updateParticipants(i.id, parseInt(e.target.value, 10) || 1)}
                          aria-label="Participants"
                        />
                      )}
                      <div className="text-right text-sm">
                        {i.itemType === "booking" && hasDeposit ? (
                          <>
                            <span className="font-medium text-[var(--foreground)]">Total €{fullEur}</span>
                            <span className="mt-0.5 block text-xs text-[var(--muted)]">Due now €{dueEur}</span>
                          </>
                        ) : (
                          <span className="font-medium text-[var(--foreground)]">€{dueEur}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="text-xs font-medium text-red-400 hover:text-red-300 hover:underline"
                        onClick={() => removeItem(i.id, i.itemType)}
                        aria-label={`Remove ${i.itemType === "product" ? i.product?.title : i.experience?.title}`}
                      >
                        Remove
                      </button>
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
                        <option value="">Choose a seat…</option>
                        {seatKeys.map((k) => (
                          <option key={k} value={k}>
                            {k.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {i.itemType === "booking" ? (
                    <div className="mt-4">
                      {i.classPackagePurchaseId ? (
                        <div className="mb-4 rounded-lg border border-emerald-800/40 bg-emerald-950/30 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Package credit</p>
                          <p className="mt-1 text-sm text-emerald-400">
                            Class price is covered by your package. Only add-ons are charged at checkout.
                          </p>
                          <button
                            type="button"
                            className="mt-2 text-xs font-medium text-emerald-400 underline"
                            onClick={() => updatePackageCredit(i.id, null)}
                          >
                            Remove package credit
                          </button>
                        </div>
                      ) : null}
                      {(i.experience?.bookingDepositBps ?? 0) > 0 && !i.classPackagePurchaseId ? (
                        <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Payment</p>
                          <div className="mt-2 space-y-2">
                            <label className="flex items-start gap-3 text-sm text-[var(--muted)]">
                              <input
                                type="radio"
                                name={`booking-payment-${i.id}`}
                                checked={effectiveBookingPaymentPreference(i) === "deposit"}
                                onChange={() => updateBookingPaymentPreference(i.id, "deposit")}
                              />
                              <span>
                                <span className="block font-medium text-[var(--foreground)]">Pay deposit now</span>
                                <span className="block text-xs text-[var(--muted)]">
                                  Due now €{(
                                    bookingChargeNowCents(
                                      lineDisplayFullCents(i),
                                      {
                                        bookingDepositBps: i.experience?.bookingDepositBps ?? 0,
                                        allowFullPaymentOption: i.experience?.allowFullPaymentOption ?? false,
                                      },
                                      "deposit",
                                    ) / 100
                                  ).toFixed(2)}
                                </span>
                              </span>
                            </label>
                            {bookingAllowsFullPaymentOption({
                              bookingDepositBps: i.experience?.bookingDepositBps ?? 0,
                              allowFullPaymentOption: i.experience?.allowFullPaymentOption ?? false,
                            }) ? (
                              <label className="flex items-start gap-3 text-sm text-[var(--muted)]">
                                <input
                                  type="radio"
                                  name={`booking-payment-${i.id}`}
                                  checked={effectiveBookingPaymentPreference(i) === "full"}
                                  onChange={() => updateBookingPaymentPreference(i.id, "full")}
                                />
                                <span>
                                  <span className="block font-medium text-[var(--foreground)]">Pay full price now</span>
                                  <span className="block text-xs text-[var(--muted)]">
                                    Charge €{(lineDisplayFullCents(i) / 100).toFixed(2)} today
                                  </span>
                                </span>
                              </label>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      <label className={ui.label} htmlFor={`booking-notes-${i.id}`}>
                        Notes for the studio
                      </label>
                      <textarea
                        id={`booking-notes-${i.id}`}
                        className={`${ui.input} mt-1 min-h-24`}
                        defaultValue={i.notes ?? ""}
                        maxLength={1000}
                        placeholder="Anything the studio should know for this booking?"
                        onBlur={(e) => updateBookingNotes(i.id, e.target.value)}
                      />
                      {i.addOnSelections && i.addOnSelections.length > 0 ? (
                        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Extras</p>
                          <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                            {i.addOnSelections.map((selection) => (
                              <li key={`${i.id}-${selection.addOnId}`}>
                                {selection.name}
                                {selection.quantity > 1 ? ` x${selection.quantity}` : ""} · +€
                                {((selection.unitPriceCents * selection.quantity) / 100).toFixed(2)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {i.intakeResponsePayload && i.intakeResponsePayload.length > 0 ? (
                        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Booking answers</p>
                          <dl className="mt-2 space-y-2 text-sm text-[var(--muted)]">
                            {i.intakeResponsePayload.map((response) => (
                              <div key={`${i.id}-${response.formId}`}>
                                <dt className="font-medium text-[var(--foreground)]">{response.label}</dt>
                                <dd className="whitespace-pre-wrap text-[var(--muted)]">{response.value || "—"}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
                  })}
                </ul>
              </section>
            ))}
          </div>
          <div className="mt-6 space-y-1 text-right text-sm text-[var(--muted)]">
            <p>
              Subtotal (due now){" "}
              <span className="text-base font-semibold text-[var(--foreground)]">€{sub.toFixed(2)}</span>
            </p>
            {couponPreview ? (
              <>
                <p>
                  {couponPreview.paymentMethod === "gift_card" ? "Gift card" : "Discount"} ({couponPreview.code}
                  {couponPreview.name ? ` — ${couponPreview.name}` : ""}){" "}
                  <span className="font-semibold text-emerald-400">
                    −€{(couponPreview.discountCents / 100).toFixed(2)}
                  </span>
                </p>
                <p>
                  After discount{" "}
                  <span className="text-base font-semibold text-[var(--foreground)]">
                    €{(couponPreview.subtotalAfter / 100).toFixed(2)}
                  </span>
                </p>
                {hasProducts ? (
                  <>
                    <p className="text-xs text-[var(--muted)]">
                      Est. shipping €{(couponPreview.shippingCents / 100).toFixed(2)} · Est. tax €
                      {(couponPreview.taxCents / 100).toFixed(2)}
                    </p>
                    <p>
                      Est. total{" "}
                      <span className="text-base font-semibold text-[var(--foreground)]">
                        €{(couponPreview.estimatedTotal / 100).toFixed(2)}
                      </span>
                    </p>
                  </>
                ) : (
                  <p>
                    Estimated total at checkout{" "}
                    <span className="text-base font-semibold text-[var(--foreground)]">
                      €{(couponPreview.estimatedTotal / 100).toFixed(2)}
                    </span>
                  </p>
                )}
              </>
            ) : null}
          </div>

          <div className="mt-10 border-t border-[var(--border)] pt-10">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Checkout details</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">We use these details for your Stripe receipt and shipping when applicable.</p>
            {err ? <p className={`${ui.errorText} mt-4`}>{err}</p> : null}
            {couponErr ? <p className={`${ui.errorText} mt-2`}>{couponErr}</p> : null}
            {!hasProducts ? (
              <p className="mt-4 text-sm text-[var(--muted)]">Booking-only: no shipping address needed. Name and email are required.</p>
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
              <div>
                <label className={ui.label} htmlFor="cart-notes">
                  Order notes
                </label>
                <textarea
                  id="cart-notes"
                  className={`${ui.input} mt-1 min-h-24`}
                  placeholder="General notes for this checkout"
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  maxLength={1000}
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
              <div className={`${ui.cardMuted} !p-[var(--pm-space-4)]`}>
                <label className={ui.label} htmlFor="cart-promo">
                  Promo code
                </label>
                {multiVendor ? (
                  <p className="mt-2 text-sm text-[var(--muted)]">
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
                          onClick={() => applyAdjustment("coupon")}
                          className={ui.buttonSecondary}
                        >
                          Use code
                        </button>
                        {appliedCode ? (
                          <button type="button" onClick={clearPromo} className={ui.buttonGhost}>
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {hasProducts
                        ? "Shipping and tax estimates use your address above."
                        : "Discount applies to class deposits in this cart."}
                    </p>
                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                      <label className={ui.label} htmlFor="cart-gift-card">
                        Gift card
                      </label>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          id="cart-gift-card"
                          className={`${ui.input} sm:min-w-0 sm:flex-1`}
                          placeholder="PM-GIFT-XXXX-XXXX"
                          value={giftCardInput}
                          onChange={(e) => setGiftCardInput(e.target.value)}
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          disabled={couponBusy || !giftCardInput.trim()}
                          onClick={() => applyAdjustment("gift_card")}
                          className={ui.buttonSecondary}
                        >
                          Apply gift card
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Gift cards are studio-specific and reduce the amount charged at checkout.
                      </p>
                    </div>
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
                      <p className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
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
                  <p className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
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
