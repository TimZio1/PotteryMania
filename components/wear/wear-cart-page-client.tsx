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
import { WEAR_LISTING_CURRENCY, WEAR_CURRENCY_POLICY_FULL } from "@/lib/wear-currency-policy";
import { formatWearMoney } from "@/lib/wear-money";
import { getWearPartnerReferralStudioId } from "@/lib/wear-referral-storage";
import { WEAR_SHIPPING_CART_NOTE } from "@/lib/wear-shipping-copy";
import { wearDisplayName } from "@/lib/wear-display-name";

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
  /** Public catalog image URLs (same as shop). */
  images?: string[];
  variants: VariantRow[];
};

function resolveLine(
  line: WearCartLine,
  byId: Map<string, ProductRow>,
): { ok: boolean; title: string; unitCents: number; currency: string } {
  const p = byId.get(line.productId);
  if (!p) return { ok: false, title: "Unknown item", unitCents: 0, currency: "EUR" };
  const displayName = wearDisplayName(p);

  if (p.variants.length > 0) {
    const vid = line.variantId?.trim() || "";
    if (!vid) return { ok: false, title: displayName, unitCents: 0, currency: p.currency };
    const v = p.variants.find((x) => x.id === vid);
    if (!v) return { ok: false, title: displayName, unitCents: 0, currency: p.currency };
    const unit = v.priceCents ?? p.priceCents;
    return { ok: true, title: `${displayName} — ${v.label}`, unitCents: unit, currency: p.currency };
  }

  if (line.variantId) return { ok: false, title: displayName, unitCents: 0, currency: p.currency };
  return { ok: true, title: displayName, unitCents: p.priceCents, currency: p.currency };
}

export function WearCartPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled") === "1";

  const [lines, setLines] = useState<WearCartLine[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [catalogReady, setCatalogReady] = useState(false);
  const [serverPricing, setServerPricing] = useState<{ preCents: number; currency: string } | null>(null);

  const refreshFromStorage = useCallback(() => {
    setLines(parseWearCart(typeof window !== "undefined" ? localStorage.getItem(WEAR_CART_STORAGE_KEY) : null));
  }, []);

  useEffect(() => {
    refreshFromStorage();
  }, [refreshFromStorage]);

  const loadCatalog = useCallback(async () => {
    setLoadError(null);
    setCatalogReady(false);
    try {
      const res = await fetch("/api/wear/products", { cache: "no-store", credentials: "same-origin" });
      let data = {} as { products?: ProductRow[]; error?: string };
      try {
        data = (await res.json()) as { products?: ProductRow[]; error?: string };
      } catch {
        /* non-JSON error body */
      }
      if (!res.ok) {
        setLoadError(
          data.error === "wear_catalog_unavailable"
            ? "The shop catalog isn’t available right now. You can still change quantities below — or try again in a moment."
            : "We couldn’t load your products. Try again in a moment.",
        );
        setProducts(Array.isArray(data.products) ? data.products : []);
        return;
      }
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch {
      setLoadError("We couldn’t load your products. Check your connection and try again.");
    } finally {
      setCatalogReady(true);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function lineImageUrl(line: WearCartLine): string | null {
    const p = byId.get(line.productId);
    const urls = p?.images;
    return urls && urls.length > 0 ? urls[0]! : null;
  }

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
  const displayCurrency = serverPricing?.currency ?? currency;

  const linesInvalid = lines.some((l) => !resolveLine(l, byId).ok);

  useEffect(() => {
    if (!catalogReady || lines.length === 0 || linesInvalid) {
      setServerPricing(null);
      return;
    }
    const ac = new AbortController();
    (async () => {
      const partnerStudioId = getWearPartnerReferralStudioId();
      try {
        const res = await fetch("/api/wear/cart-pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({
            items: lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              ...(l.variantId ? { variantId: l.variantId } : {}),
            })),
            ...(partnerStudioId ? { studioId: partnerStudioId } : {}),
          }),
        });
        const data = (await res.json()) as {
          preDiscountSubtotalCents?: number;
          currency?: string;
          error?: string;
        };
        if (ac.signal.aborted) return;
        if (!res.ok) {
          setServerPricing(null);
          return;
        }
        setServerPricing({
          preCents: data.preDiscountSubtotalCents ?? 0,
          currency: (data.currency ?? "EUR").toUpperCase(),
        });
      } catch {
        if (!ac.signal.aborted) setServerPricing(null);
      }
    })();
    return () => ac.abort();
  }, [catalogReady, lines, linesInvalid]);

  const cartCurrencyIssue = useMemo(() => {
    if (lines.length === 0) return null;
    const currencies = new Set<string>();
    for (const l of lines) {
      const p = byId.get(l.productId);
      if (!p) continue;
      currencies.add((p.currency ?? WEAR_LISTING_CURRENCY).toUpperCase());
    }
    if (currencies.size > 1) return "mixed" as const;
    const only = [...currencies][0];
    if (only && only !== WEAR_LISTING_CURRENCY) return "non_eur" as const;
    return null;
  }, [lines, byId]);

  const onCheckout = useCallback(async () => {
    setCheckoutError(null);
    if (lines.length === 0) {
      setCheckoutError("Your cart is empty.");
      return;
    }
    if (cartCurrencyIssue) {
      setCheckoutError(
        cartCurrencyIssue === "mixed"
          ? "Your cart mixes currencies — remove items until everything matches."
          : `This shop path is EUR-only right now. Remove items priced outside ${WEAR_LISTING_CURRENCY} or contact support.`,
      );
      return;
    }
    setCheckoutBusy(true);
    try {
      const partnerStudioId = getWearPartnerReferralStudioId();
      const res = await fetch("/api/wear/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(partnerStudioId ? { studioId: partnerStudioId } : {}),
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
        setCheckoutError(data.error ?? "Something went wrong at checkout. Try again in a moment.");
        return;
      }
      if (data.url) {
        if (data.orderId) {
          const refId = getWearPartnerReferralStudioId();
          trackWearEvent(WEAR_EVENT_KINDS.checkoutStarted, {
            orderId: data.orderId,
            meta: {
              item_count: lines.length,
              ...(refId ? { referring_studio_id: refId } : {}),
            },
          });
        }
        window.location.href = data.url;
        return;
      }
      setCheckoutError("Something went wrong at checkout. Try again in a moment.");
    } catch {
      setCheckoutError("Connection problem. Check your internet and try again.");
    } finally {
      setCheckoutBusy(false);
    }
  }, [cartCurrencyIssue, lines]);

  return (
    <main className="min-h-[60vh] bg-[#f7f2ec] px-4 py-16 !text-stone-900 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-lg">
        <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-stone-700">Cart</p>
        <h1 className="mt-4 text-center font-serif text-3xl text-amber-950">Your selection</h1>

        {cancelled ? (
          <div className="mt-6 rounded border border-amber-300/70 bg-amber-50 px-4 py-4 text-center text-sm text-amber-950">
            <p>Checkout was cancelled — nothing was charged.</p>
            <p className="mt-2 text-stone-600">Your cart is still here. Review it and try again whenever you’re ready.</p>
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

        {loadError ? (
          <div className="mt-6 space-y-3 text-center">
            <p className="text-sm text-amber-950">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadCatalog()}
              className="text-sm font-medium text-amber-900 underline underline-offset-4 hover:text-amber-800"
            >
              Try loading again
            </button>
          </div>
        ) : null}

        {lines.length === 0 ? (
          <p className="mt-12 text-center text-sm text-stone-600">
            Your cart is empty.{" "}
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
              const thumbUrl = lineImageUrl(l);
              return (
                <li key={key} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-100">
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbUrl}
                          alt={r.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-stone-400">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                    <p className="font-medium text-amber-950">{r.title}</p>
                    {r.ok ? (
                      <p className="mt-1 text-sm text-stone-600">
                        {formatWearMoney(r.unitCents, r.currency)} each · {formatWearMoney(lineCents, r.currency)} line
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-amber-800">This item isn’t available anymore — please remove it.</p>
                    )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                    <div className="flex items-center rounded-full border border-stone-200 bg-white" role="group" aria-label={`Quantity for ${r.title}`}>
                      <button
                        type="button"
                        onClick={() => setQty(key, l.quantity - 1)}
                        disabled={l.quantity <= 1}
                        aria-label="Decrease quantity"
                        className="inline-flex h-11 w-11 items-center justify-center text-lg text-stone-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold text-stone-900" aria-live="polite">{l.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQty(key, l.quantity + 1)}
                        disabled={l.quantity >= 99}
                        aria-label="Increase quantity"
                        className="inline-flex h-11 w-11 items-center justify-center text-lg text-stone-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(key)}
                      aria-label={`Remove ${r.title}`}
                      className="min-h-11 px-2 text-xs font-medium uppercase tracking-wider text-stone-600 transition hover:text-red-700"
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
            <dl className="mt-10 space-y-2 border-t border-stone-200/80 pt-8 text-sm">
              <div className="flex justify-between">
                <dt className="font-medium text-stone-800">Merchandise</dt>
                <dd className="text-amber-950">
                  {formatWearMoney(serverPricing?.preCents ?? subtotalCents, displayCurrency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-600">Shipping</dt>
                <dd className="text-stone-600">Calculated at checkout</dd>
              </div>
              <div className="flex justify-between border-t border-stone-200/80 pt-3 text-base">
                <dt className="font-semibold text-amber-950">Estimated total</dt>
                <dd className="font-semibold text-amber-950">
                  {formatWearMoney(serverPricing?.preCents ?? subtotalCents, displayCurrency)}
                  <span className="ml-1 text-xs font-normal text-stone-500">+ shipping</span>
                </dd>
              </div>
            </dl>

            <p className="mt-3 text-xs leading-relaxed text-stone-600">{WEAR_SHIPPING_CART_NOTE}</p>

            {checkoutError ? <p className="mt-4 text-sm text-red-700">{checkoutError}</p> : null}

            {cartCurrencyIssue ? (
              <p className="mt-4 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                {cartCurrencyIssue === "mixed"
                  ? "This cart mixes currencies. Adjust quantities or remove lines so every item uses the same currency before checkout."
                  : `The public wear shop is priced in ${WEAR_LISTING_CURRENCY}. Remove non-${WEAR_LISTING_CURRENCY} items to continue.`}
              </p>
            ) : null}

            <ul className="mt-8 grid grid-cols-3 gap-2 text-[11px] leading-tight text-stone-600">
              <li className="flex flex-col items-center gap-1 rounded-xl border border-stone-200/80 bg-white px-2 py-3 text-center">
                <span aria-hidden className="text-base">🔒</span>
                <span>Secure Stripe</span>
              </li>
              <li className="flex flex-col items-center gap-1 rounded-xl border border-stone-200/80 bg-white px-2 py-3 text-center">
                <span aria-hidden className="text-base">↩</span>
                <span>30-day returns</span>
              </li>
              <li className="flex flex-col items-center gap-1 rounded-xl border border-stone-200/80 bg-white px-2 py-3 text-center">
                <span aria-hidden className="text-base">🌍</span>
                <span>Worldwide shipping</span>
              </li>
            </ul>

            <button
              type="button"
              disabled={
                checkoutBusy || !catalogReady || lines.length === 0 || linesInvalid || cartCurrencyIssue != null
              }
              onClick={onCheckout}
              className="mt-6 w-full min-h-14 rounded-full border border-amber-800/50 bg-amber-950 px-6 text-base font-semibold tracking-wide text-white transition hover:bg-amber-900 disabled:opacity-50"
            >
              {checkoutBusy
                ? "Redirecting to Stripe…"
                : `Pay ${formatWearMoney(serverPricing?.preCents ?? subtotalCents, displayCurrency)} — secure checkout`}
            </button>
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-stone-600">
              <span aria-hidden>🔒</span>
              Apple Pay · Google Pay · Card · Link
            </p>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-stone-500">{WEAR_CURRENCY_POLICY_FULL}</p>
          </>
        ) : null}

        <p className="mt-10 text-center">
          <button
            type="button"
            onClick={() => router.push("/wear/shop")}
            className="text-sm font-medium text-stone-700 underline underline-offset-4 hover:text-amber-800"
          >
            ← Continue shopping
          </button>
        </p>
      </div>
    </main>
  );
}
