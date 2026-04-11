"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  WEAR_CART_STORAGE_KEY,
  cartLineKey,
  notifyWearCartChanged,
  parseWearCart,
  serializeWearCart,
  type WearCartLine,
} from "@/lib/wear-cart";
import { WEAR_EVENT_KINDS, trackWearEvent } from "@/lib/wear-analytics-client";
import { formatWearMoney } from "@/lib/wear-money";

type VariantRow = {
  id: string;
  label: string;
  priceCents: number | null;
  stockQuantity: number | null;
};

type ProductRow = {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  variants: VariantRow[];
};

function resolveLine(
  line: WearCartLine,
  byId: Map<string, ProductRow>,
): { ok: boolean; title: string; unitCents: number; currency: string } {
  const p = byId.get(line.productId);
  if (!p) return { ok: false, title: "Unknown item", unitCents: 0, currency: "EUR" };

  if (p.variants.length > 0) {
    const vid = line.variantId?.trim() || "";
    if (!vid) return { ok: false, title: p.name, unitCents: 0, currency: p.currency };
    const v = p.variants.find((x) => x.id === vid);
    if (!v) return { ok: false, title: p.name, unitCents: 0, currency: p.currency };
    const unit = v.priceCents ?? p.priceCents;
    return { ok: true, title: `${p.name} — ${v.label}`, unitCents: unit, currency: p.currency };
  }

  if (line.variantId) return { ok: false, title: p.name, unitCents: 0, currency: p.currency };
  return { ok: true, title: p.name, unitCents: p.priceCents, currency: p.currency };
}

export function WearCartPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled") === "1";

  const [lines, setLines] = useState<WearCartLine[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [catalogReady, setCatalogReady] = useState(false);

  const refreshFromStorage = useCallback(() => {
    setLines(parseWearCart(typeof window !== "undefined" ? localStorage.getItem(WEAR_CART_STORAGE_KEY) : null));
  }, []);

  useEffect(() => {
    refreshFromStorage();
  }, [refreshFromStorage]);

  useEffect(() => {
    let cancelledReq = false;
    (async () => {
      try {
        const res = await fetch("/api/wear/products", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load catalog");
        const data = (await res.json()) as { products?: ProductRow[] };
        if (!cancelledReq) setProducts(Array.isArray(data.products) ? data.products : []);
      } catch {
        if (!cancelledReq) setLoadError("Could not load products.");
      } finally {
        if (!cancelledReq) setCatalogReady(true);
      }
    })();
    return () => {
      cancelledReq = true;
    };
  }, []);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const persist = useCallback((next: WearCartLine[]) => {
    localStorage.setItem(WEAR_CART_STORAGE_KEY, serializeWearCart(next));
    setLines(next);
    notifyWearCartChanged();
  }, []);

  const setQty = useCallback(
    (key: string, quantity: number) => {
      const q = Math.min(99, Math.max(1, quantity));
      const next = lines
        .map((l) => (cartLineKey(l) === key ? { ...l, quantity: q } : l))
        .filter((l) => l.quantity > 0);
      persist(next);
    },
    [lines, persist],
  );

  const removeLine = useCallback(
    (key: string) => {
      persist(lines.filter((l) => cartLineKey(l) !== key));
    },
    [lines, persist],
  );

  const subtotalCents = useMemo(() => {
    let t = 0;
    for (const l of lines) {
      const r = resolveLine(l, byId);
      if (r.ok) t += r.unitCents * l.quantity;
    }
    return t;
  }, [lines, byId]);

  const currency = products[0]?.currency ?? "EUR";

  const onCheckout = useCallback(async () => {
    setCheckoutError(null);
    setNameError(null);
    setEmailError(null);
    let hasFieldErr = false;
    if (!customerName.trim()) {
      setNameError("Full name is required.");
      hasFieldErr = true;
    }
    const emailVal = customerEmail.trim();
    if (!emailVal) {
      setEmailError("Email is required.");
      hasFieldErr = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setEmailError("Enter a valid email address.");
      hasFieldErr = true;
    }
    if (hasFieldErr) return;
    if (lines.length === 0) {
      setCheckoutError("Your cart is empty.");
      return;
    }
    setCheckoutBusy(true);
    try {
      const res = await fetch("/api/wear/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            ...(l.variantId ? { variantId: l.variantId } : {}),
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        orderId?: string;
      };
      if (!res.ok) {
        setCheckoutError(data.error ?? "Checkout failed.");
        return;
      }
      if (data.url) {
        if (data.orderId) {
          trackWearEvent(WEAR_EVENT_KINDS.checkoutStarted, {
            orderId: data.orderId,
            meta: { item_count: lines.length },
          });
        }
        window.location.href = data.url;
        return;
      }
      setCheckoutError("No checkout URL returned.");
    } catch {
      setCheckoutError("Network error.");
    } finally {
      setCheckoutBusy(false);
    }
  }, [customerEmail, customerName, lines]);

  const linesInvalid = lines.some((l) => !resolveLine(l, byId).ok);

  return (
    <main className="min-h-[60vh] bg-[#f7f2ec] px-4 py-16 text-(--brand-ink) sm:px-6 sm:py-20">
      <div className="mx-auto max-w-lg">
        <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-stone-500">Cart</p>
        <h1 className="mt-4 text-center font-serif text-3xl text-amber-950">Your selection</h1>

        {cancelled ? (
          <div className="mt-6 rounded border border-amber-300/70 bg-amber-50 px-4 py-4 text-center text-sm text-amber-950">
            <p>Checkout was cancelled. Nothing was charged.</p>
            <p className="mt-2 text-stone-600">Your cart is still here, so you can review it and try again whenever you’re ready.</p>
            <button
              type="button"
              onClick={onCheckout}
              disabled={checkoutBusy || !catalogReady || lines.length === 0 || linesInvalid}
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full border border-amber-800/50 bg-amber-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-900 disabled:opacity-50"
            >
              Try checkout again
            </button>
          </div>
        ) : null}

        {loadError ? <p className="mt-6 text-center text-sm text-red-700">{loadError}</p> : null}

        {lines.length === 0 ? (
          <p className="mt-12 text-center text-sm text-stone-500">
            Nothing here yet.{" "}
            <Link href="/wear/shop" className="text-amber-950 underline underline-offset-4 hover:text-amber-800">
              Browse the shop
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-12 space-y-8 border-t border-stone-200/80 pt-10">
            {lines.map((l) => {
              const key = cartLineKey(l);
              const r = resolveLine(l, byId);
              const lineCents = r.ok ? r.unitCents * l.quantity : 0;
              return (
                <li key={key} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-amber-950">{r.title}</p>
                    {r.ok ? (
                      <p className="mt-1 text-sm text-stone-500">
                        {formatWearMoney(r.unitCents, r.currency)} each · {formatWearMoney(lineCents, r.currency)} line
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-amber-800">This item is no longer valid — remove it.</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="sr-only" htmlFor={`qty-${key}`}>
                      Quantity for {r.title}
                    </label>
                    <input
                      id={`qty-${key}`}
                      type="number"
                      min={1}
                      max={99}
                      value={l.quantity}
                      onChange={(e) => setQty(key, parseInt(e.target.value, 10) || 1)}
                      className="min-h-11 w-16 rounded-xl border border-stone-200 bg-white px-2 py-2 text-center text-sm text-stone-900"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(key)}
                      className="min-h-11 px-2 text-xs uppercase tracking-wider text-stone-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {lines.length > 0 ? (
          <>
            <div className="mt-10 flex justify-between border-t border-stone-200/80 pt-8 text-sm">
              <span className="text-stone-500">Subtotal</span>
              <span className="text-amber-950">{formatWearMoney(subtotalCents, currency)}</span>
            </div>
            <p className="mt-2 text-xs text-stone-500">
              Shipping is added at secure checkout (standard rate). Taxes may apply per Stripe.
            </p>

            <div className="mt-10 space-y-4">
              <div>
                <label htmlFor="wear-cart-name" className="block text-xs font-medium uppercase tracking-wider text-stone-500">
                  Full name
                </label>
                <input
                  id="wear-cart-name"
                  autoComplete="name"
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); setNameError(null); }}
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? "wear-cart-name-err" : undefined}
                  className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 ${nameError ? "border-red-500" : "border-stone-200"}`}
                  placeholder="Alex Maker"
                />
                {nameError ? <p id="wear-cart-name-err" className="mt-1 text-xs text-red-700">{nameError}</p> : null}
              </div>
              <div>
                <label htmlFor="wear-cart-email" className="block text-xs font-medium uppercase tracking-wider text-stone-500">
                  Email
                </label>
                <input
                  id="wear-cart-email"
                  type="email"
                  autoComplete="email"
                  value={customerEmail}
                  onChange={(e) => { setCustomerEmail(e.target.value); setEmailError(null); }}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "wear-cart-email-err" : undefined}
                  className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 ${emailError ? "border-red-500" : "border-stone-200"}`}
                  placeholder="you@example.com"
                />
                {emailError ? <p id="wear-cart-email-err" className="mt-1 text-xs text-red-700">{emailError}</p> : null}
              </div>
            </div>

            {checkoutError ? <p className="mt-4 text-sm text-red-700">{checkoutError}</p> : null}

            <button
              type="button"
              disabled={checkoutBusy || !catalogReady || lines.length === 0 || linesInvalid}
              onClick={onCheckout}
              className="mt-8 w-full min-h-12 rounded-full border border-amber-800/50 bg-amber-950 px-6 text-sm font-medium tracking-wide text-white transition hover:bg-amber-900 disabled:opacity-50"
            >
              {checkoutBusy ? "Redirecting…" : "Pay securely"}
            </button>
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-stone-500">
              <span aria-hidden="true">🔒</span>
              Secure Stripe checkout
            </p>
          </>
        ) : null}

        <p className="mt-10 text-center">
          <button
            type="button"
            onClick={() => router.push("/wear/shop")}
            className="text-sm text-stone-500 underline underline-offset-4 hover:text-amber-800"
          >
            Continue shopping
          </button>
        </p>
      </div>
    </main>
  );
}
