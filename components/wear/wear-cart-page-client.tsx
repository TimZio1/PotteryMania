"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  WEAR_CART_STORAGE_KEY,
  cartLineKey,
  notifyWearCartChanged,
  parseWearCart,
  serializeWearCart,
  type WearCartLine,
} from "@/lib/wear-cart";
import { WEAR_EVENT_KINDS, trackWearEvent } from "@/lib/wear-analytics-client";
import { setWearCheckoutSnapshot } from "@/lib/wear-checkout-snapshot";
import { WEAR_LISTING_CURRENCY, WEAR_CURRENCY_POLICY_FULL } from "@/lib/wear-currency-policy";
import { formatWearMoney } from "@/lib/wear-money";
import { getWearPartnerReferralStudioId } from "@/lib/wear-referral-storage";
import { WEAR_SHIPPING_CART_NOTE, WEAR_SHIPPING_TRUST_STRIP } from "@/lib/wear-shipping-copy";
import {
  WEAR_CHECKOUT_SHIPPING_COUNTRIES,
  WEAR_FREE_SHIPPING_THRESHOLD_CENTS,
  isWearDomesticShippingTierCountry,
  resolveWearShippingAmountMinorUnits,
} from "@/lib/wear-shipping";

const WEAR_SHIP_COUNTRY_STORAGE_KEY = "wear_ship_to_iso2";
import { wearDisplayName } from "@/lib/wear-display-name";
import { wearListingImageSrc } from "@/lib/wear-listing-image";
import type { WearCatalogImage } from "@/lib/wear-product-json";
import { pickWearLineCatalogImage } from "@/lib/wear-line-image";

type VariantRow = {
  id: string;
  label: string;
  optionSize?: string | null;
  optionColor?: string | null;
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
  /** Sorted hero-first images with appearance metadata — used for variant-accurate cart thumbs. */
  catalogImages?: Array<Pick<WearCatalogImage, "url" | "appearanceName" | "perspective">>;
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
  const [serverPricing, setServerPricing] = useState<{
    preCents: number;
    currency: string;
    campaign: { label: string; discountCents: number; freeItemCount: number } | null;
  } | null>(null);
  const [pricingState, setPricingState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  // Coupon state — `couponInput` is the in-flight text, `appliedCoupon` is the server-validated
  // preview that locks the discount applied to the Pay button + sent to /api/wear/checkout.
  // The applied coupon must be auto-cleared when the cart changes (lines, qty, currency) to avoid
  // staleness — server re-validates on checkout regardless, but the user shouldn't see a wrong total.
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    name: string | null;
    discountCents: number;
    preDiscountSubtotalCents: number;
    subtotalAfterCents: number;
    currency: string;
  } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [shipToCountry, setShipToCountry] = useState("");

  useEffect(() => {
    try {
      const s = localStorage.getItem(WEAR_SHIP_COUNTRY_STORAGE_KEY)?.trim().toUpperCase();
      if (s && /^[A-Z]{2}$/.test(s) && (WEAR_CHECKOUT_SHIPPING_COUNTRIES as readonly string[]).includes(s)) {
        setShipToCountry(s);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const shipCountryOptions = useMemo(() => {
    const dn = typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
    return [...WEAR_CHECKOUT_SHIPPING_COUNTRIES]
      .map((code) => ({ code, label: dn?.of(code) ?? code }))
      .sort((a, b) => a.label.localeCompare(b.label, "en"));
  }, []);

  const onShipCountryChange = useCallback((value: string) => {
    const v = value.trim().toUpperCase();
    setShipToCountry(v);
    try {
      if (v && (WEAR_CHECKOUT_SHIPPING_COUNTRIES as readonly string[]).includes(v)) {
        localStorage.setItem(WEAR_SHIP_COUNTRY_STORAGE_KEY, v);
      } else {
        localStorage.removeItem(WEAR_SHIP_COUNTRY_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

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
    if (!p) return null;

    const vid = line.variantId?.trim() || "";
    const variant = vid ? p.variants.find((x) => x.id === vid) : undefined;

    const catalog: WearCatalogImage[] = (p.catalogImages?.length ? p.catalogImages : []).map((row) => ({
      url: row.url,
      appearanceName: row.appearanceName ?? null,
      appearanceId: null,
      perspective: row.perspective ?? null,
      imageId: null,
    }));

    if (catalog.length > 0) {
      const picked = pickWearLineCatalogImage(catalog, variant);
      const raw = picked?.url;
      if (raw) return wearListingImageSrc(raw, 320);
    }

    const urls = p.images;
    return urls && urls.length > 0 ? wearListingImageSrc(urls[0]!, 320) : null;
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
  const merchandiseCents = serverPricing?.preCents ?? subtotalCents;
  // Clamp discountCents in case engine drift makes it briefly exceed the live merchandise total
  // (e.g. server pricing arrived after coupon preview). The button + Stripe still revalidate.
  const couponDiscountCents = appliedCoupon
    ? Math.min(appliedCoupon.discountCents, merchandiseCents)
    : 0;
  const campaignDiscountCents = Math.min(
    serverPricing?.campaign?.discountCents ?? 0,
    Math.max(0, merchandiseCents - couponDiscountCents),
  );
  const campaignFreeItemCount = serverPricing?.campaign?.freeItemCount ?? 0;
  const campaignLabel = serverPricing?.campaign?.label ?? "Buy 4, get 1 free";
  const merchandiseAfterDiscountCents = Math.max(0, merchandiseCents - couponDiscountCents - campaignDiscountCents);
  const shipToDomesticFreeTier =
    Boolean(shipToCountry && /^[A-Z]{2}$/.test(shipToCountry)) && isWearDomesticShippingTierCountry(shipToCountry);
  // Free-shipping threshold: post-discount merchandise + EU/IS/GB only — matches
  // `/api/wear/checkout` (`resolveWearShippingAmountMinorUnits`).
  const qualifiesForFreeShipping =
    shipToDomesticFreeTier && merchandiseAfterDiscountCents >= WEAR_FREE_SHIPPING_THRESHOLD_CENTS;
  const freeShippingRemainingCents = Math.max(
    0,
    WEAR_FREE_SHIPPING_THRESHOLD_CENTS - merchandiseAfterDiscountCents,
  );
  const estimatedShippingMinor = useMemo(() => {
    if (!shipToCountry || !/^[A-Z]{2}$/.test(shipToCountry)) return null;
    return resolveWearShippingAmountMinorUnits(
      merchandiseAfterDiscountCents,
      displayCurrency,
      shipToCountry,
    );
  }, [merchandiseAfterDiscountCents, displayCurrency, shipToCountry]);

  const linesInvalid = lines.some((l) => !resolveLine(l, byId).ok);
  const cartQuantity = lines.reduce((sum, line) => sum + (line.quantity || 0), 0);
  const campaignRemainingItems = Math.max(0, 5 - (cartQuantity % 5 || 5));

  useEffect(() => {
    if (!catalogReady || lines.length === 0 || linesInvalid) {
      setServerPricing(null);
      setPricingState("idle");
      return;
    }
    const ac = new AbortController();
    setPricingState("loading");
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
          campaign?: { label?: string; discountCents?: number; freeItemCount?: number };
          currency?: string;
          error?: string;
        };
        if (ac.signal.aborted) return;
        if (!res.ok) {
          setServerPricing(null);
          setPricingState("error");
          return;
        }
        setServerPricing({
          preCents: data.preDiscountSubtotalCents ?? 0,
          currency: (data.currency ?? "EUR").toUpperCase(),
          campaign: data.campaign
            ? {
                label: data.campaign.label ?? "Buy 4, get 1 free",
                discountCents: data.campaign.discountCents ?? 0,
                freeItemCount: data.campaign.freeItemCount ?? 0,
              }
            : null,
        });
        setPricingState("ready");
      } catch {
        if (!ac.signal.aborted) {
          setServerPricing(null);
          setPricingState("error");
        }
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

  // Fingerprint of cart lines — when this changes, the previously-applied coupon may no longer
  // refer to a valid cart (line removed, qty changed, currency switched), so we clear it.
  const cartFingerprint = useMemo(
    () =>
      lines
        .map((l) => `${l.productId}:${l.variantId ?? ""}:${l.quantity}`)
        .sort()
        .join("|"),
    [lines],
  );
  const couponCartSig = useRef("");

  useEffect(() => {
    if (!appliedCoupon) {
      couponCartSig.current = cartFingerprint;
      return;
    }
    if (couponCartSig.current !== "" && couponCartSig.current !== cartFingerprint) {
      setAppliedCoupon(null);
      setCouponError("Cart changed — re-apply your code.");
    }
    couponCartSig.current = cartFingerprint;
  }, [cartFingerprint, appliedCoupon]);

  const applyCoupon = useCallback(async () => {
    const code = couponInput.trim();
    if (!code) return;
    if (cartCurrencyIssue || lines.length === 0) {
      setCouponError("Fix the cart issues above before applying a code.");
      return;
    }
    setCouponBusy(true);
    setCouponError(null);
    try {
      const partnerStudioId = getWearPartnerReferralStudioId();
      const res = await fetch("/api/wear/coupon/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponCode: code,
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            ...(l.variantId ? { variantId: l.variantId } : {}),
          })),
          ...(partnerStudioId ? { studioId: partnerStudioId } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        name?: string | null;
        discountCents?: number;
        preDiscountSubtotalCents?: number;
        subtotalAfterCents?: number;
        currency?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || typeof data.discountCents !== "number") {
        setAppliedCoupon(null);
        setCouponError(data.error ?? "That code didn’t work. Check the spelling and try again.");
        return;
      }
      setAppliedCoupon({
        code: data.code ?? code,
        name: data.name ?? null,
        discountCents: data.discountCents,
        preDiscountSubtotalCents: data.preDiscountSubtotalCents ?? 0,
        subtotalAfterCents: data.subtotalAfterCents ?? 0,
        currency: (data.currency ?? "EUR").toUpperCase(),
      });
      couponCartSig.current = cartFingerprint;
    } catch {
      setAppliedCoupon(null);
      setCouponError("Couldn’t reach the discount service. Try again in a moment.");
    } finally {
      setCouponBusy(false);
    }
  }, [couponInput, cartCurrencyIssue, lines, cartFingerprint]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }, []);

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
    if (
      !shipToCountry ||
      !/^[A-Z]{2}$/.test(shipToCountry) ||
      !(WEAR_CHECKOUT_SHIPPING_COUNTRIES as readonly string[]).includes(shipToCountry)
    ) {
      setCheckoutError("Choose your delivery country before paying.");
      return;
    }
    setCheckoutBusy(true);
    try {
      const partnerStudioId = getWearPartnerReferralStudioId();
      const res = await fetch("/api/wear/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingCountry: shipToCountry,
          ...(partnerStudioId ? { studioId: partnerStudioId } : {}),
          ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
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
        // Server-side coupon revalidation is the single source of truth — if it rejects the code
        // (expired between preview + checkout, usage cap hit, etc.), drop the applied state and
        // surface the error so the user can try a fresh code or proceed without one.
        if (appliedCoupon) {
          setAppliedCoupon(null);
        }
        setCheckoutError(data.error ?? "Something went wrong at checkout. Try again in a moment.");
        return;
      }
      if (data.url) {
        // Use the post-discount total for Pixel value — that's what the buyer actually pays.
        const preDiscountCents = serverPricing?.preCents ?? subtotalCents;
        const valueCents = Math.max(
          0,
          preDiscountCents - (appliedCoupon?.discountCents ?? 0) - campaignDiscountCents,
        );
        const checkoutCurrency = (serverPricing?.currency ?? currency ?? "EUR").toUpperCase();
        const checkoutValue = Number((valueCents / 100).toFixed(2));
        const numItems = lines.reduce((s, l) => s + (l.quantity || 0), 0);
        const contentIds = lines.map((l) => l.productId);

        // Snapshot for the success page Pixel `Purchase` — the success page only knows the Stripe
        // session_id, so without this it can't fire a Pixel event with value/currency/content_ids.
        setWearCheckoutSnapshot({
          contentIds,
          value: checkoutValue,
          currency: checkoutCurrency,
          numItems,
          ts: Date.now(),
        });

        if (data.orderId) {
          const refId = getWearPartnerReferralStudioId();
          trackWearEvent(WEAR_EVENT_KINDS.checkoutStarted, {
            orderId: data.orderId,
            contentIds,
            value: checkoutValue,
            currency: checkoutCurrency,
            quantity: numItems,
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
  }, [
    cartCurrencyIssue,
    lines,
    currency,
    serverPricing,
    subtotalCents,
    appliedCoupon,
    campaignDiscountCents,
    shipToCountry,
  ]);

  return (
    <main className="pm-brand pm-slab-dark relative min-h-[60vh] px-4 py-16 !bg-[var(--ink)] !text-[var(--clay)] sm:px-6 sm:py-20">
      <div className="mx-auto max-w-lg">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-(--clay)/65">The bag</p>
        <h1 className="mt-4 text-center font-serif text-3xl text-[var(--clay)]">Your pick.</h1>

        {cancelled ? (
          <div className="mt-6 rounded border border-(--heat)/35 bg-(--heat)/12 px-4 py-4 text-center text-sm text-[var(--clay)]">
            <p>Checkout was cancelled — nothing was charged.</p>
            <p className="mt-2 text-(--clay)/72">Your cart is still here. Review it and try again whenever you’re ready.</p>
            <button
              type="button"
              onClick={onCheckout}
              disabled={
                checkoutBusy || !catalogReady || lines.length === 0 || linesInvalid || !shipToCountry
              }
              className="pm-btn pm-btn--heat mt-3 inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm disabled:opacity-50"
            >
              Try checkout again
            </button>
          </div>
        ) : null}

        {loadError ? (
          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-[var(--clay)]">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadCatalog()}
              className="pm-btn pm-btn--ghost inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm"
            >
              Try loading again
            </button>
          </div>
        ) : null}

        {lines.length === 0 ? (
          <div className="mt-14 flex flex-col items-center gap-5 text-center">
            <p className="font-serif text-3xl text-[var(--clay)] sm:text-4xl">Bag empty.</p>
            <p className="text-sm text-(--clay)/70">Work calls.</p>
            <Link
              href="/wear/shop"
              className="pm-btn pm-btn--heat inline-flex min-h-12 items-center justify-center px-7 text-sm font-semibold uppercase tracking-[0.14em]"
            >
              Enter the drop →
            </Link>
          </div>
        ) : !catalogReady ? (
          <ul className="mt-12 space-y-8 border-t border-(--clay)/18 pt-10" aria-busy="true" aria-label="Loading cart">
            {lines.map((l) => (
              <li
                key={cartLineKey(l)}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 gap-4">
                  <div className="h-20 w-20 shrink-0 animate-pulse rounded-2xl bg-(--clay)/12" />
                  <div className="min-w-0 space-y-2 pt-1">
                    <div className="h-3 w-40 animate-pulse rounded bg-(--clay)/12" />
                    <div className="h-3 w-24 animate-pulse rounded bg-(--clay)/10" />
                  </div>
                </div>
                <div className="h-11 w-32 animate-pulse rounded-full bg-(--clay)/10" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-12 space-y-8 border-t border-(--clay)/18 pt-10">
            {lines.map((l) => {
              const key = cartLineKey(l);
              const r = resolveLine(l, byId);
              const lineCents = r.ok ? r.unitCents * l.quantity : 0;
              const thumbUrl = lineImageUrl(l);
              return (
                <li key={key} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-(--clay)/18 bg-(--clay)/6">
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbUrl}
                          alt={r.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-(--clay)/45">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                    <p className="font-medium text-[var(--clay)]">{r.title}</p>
                    {r.ok ? (
                      <p className="mt-1 text-sm text-(--clay)/72">
                        {formatWearMoney(r.unitCents, r.currency)} each · {formatWearMoney(lineCents, r.currency)} line
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-(--heat)">This item isn’t available anymore — please remove it.</p>
                    )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                    <div className="flex items-center rounded-full border border-(--clay)/22 bg-(--clay)/8" role="group" aria-label={`Quantity for ${r.title}`}>
                      <button
                        type="button"
                        onClick={() => setQty(key, l.quantity - 1)}
                        disabled={l.quantity <= 1}
                        aria-label="Decrease quantity"
                        className="inline-flex h-11 w-11 items-center justify-center text-lg text-(--clay)/85 transition hover:bg-(--clay)/12 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold text-[var(--clay)]" aria-live="polite">{l.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQty(key, l.quantity + 1)}
                        disabled={l.quantity >= 99}
                        aria-label="Increase quantity"
                        className="inline-flex h-11 w-11 items-center justify-center text-lg text-(--clay)/85 transition hover:bg-(--clay)/12 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(key)}
                      aria-label={`Remove ${r.title}`}
                      className="min-h-11 px-2 text-xs font-medium uppercase tracking-wider text-(--clay)/65 transition hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {lines.length > 0 && catalogReady ? (
          <>
            <div className="mt-10 border-t border-(--clay)/18 pt-8">
              <label htmlFor="wear-ship-country" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--clay)/72">
                Deliver to
              </label>
              <select
                id="wear-ship-country"
                value={shipToCountry}
                onChange={(e) => onShipCountryChange(e.target.value)}
                className="mt-2 w-full rounded-xl border border-(--clay)/22 bg-(--clay)/8 px-3 py-2.5 text-sm text-[var(--clay)] outline-none transition focus:border-(--heat)/40"
              >
                <option value="">Select country…</option>
                {shipCountryOptions.map(({ code, label }) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[10px] leading-relaxed text-(--clay)/50">
                Shipping is priced for this country. Stripe checkout will only allow this address — change here if
                needed.
              </p>
            </div>

            <dl className="mt-8 space-y-2 border-t border-(--clay)/18 pt-8 text-sm">
              <div className="flex justify-between">
                <dt className="font-medium text-(--clay)/85">Merchandise</dt>
                <dd className="text-[var(--clay)]">
                  {pricingState === "loading" ? (
                    <span className="inline-block h-3 w-20 animate-pulse rounded bg-(--clay)/12" aria-label="Calculating" />
                  ) : (
                    formatWearMoney(merchandiseCents, displayCurrency)
                  )}
                </dd>
              </div>
              {appliedCoupon && couponDiscountCents > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-emerald-400">
                    Discount{" "}
                    <span className="font-mono text-[11px] uppercase tracking-wider text-(--clay)/50">
                      ({appliedCoupon.code})
                    </span>
                  </dt>
                  <dd className="font-semibold text-emerald-400">
                    −{formatWearMoney(couponDiscountCents, displayCurrency)}
                  </dd>
                </div>
              ) : null}
              {campaignDiscountCents > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-emerald-400">
                    {campaignLabel}
                    {campaignFreeItemCount > 0 ? (
                      <span className="ml-1 font-mono text-[11px] uppercase tracking-wider text-(--clay)/50">
                        ({campaignFreeItemCount} free)
                      </span>
                    ) : null}
                  </dt>
                  <dd className="font-semibold text-emerald-400">
                    −{formatWearMoney(campaignDiscountCents, displayCurrency)}
                  </dd>
                </div>
              ) : cartQuantity > 0 && campaignRemainingItems > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-(--clay)/55">Campaign</dt>
                  <dd className="text-right text-(--clay)/55">
                    Add {campaignRemainingItems} item{campaignRemainingItems === 1 ? "" : "s"} for a free lowest-priced piece
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-(--clay)/72">Shipping</dt>
                <dd
                  className={
                    qualifiesForFreeShipping ? "text-right font-semibold text-emerald-400" : "text-right text-(--clay)/72"
                  }
                >
                  {pricingState === "loading" ? (
                    <span className="inline-block h-3 w-32 animate-pulse rounded bg-(--clay)/12" aria-label="Calculating" />
                  ) : qualifiesForFreeShipping ? (
                    "Free"
                  ) : estimatedShippingMinor == null ? (
                    <span className="text-(--clay)/55">Select country</span>
                  ) : (
                    <span className="block">
                      <span className="font-medium">{formatWearMoney(estimatedShippingMinor, displayCurrency)}</span>
                      {shipToDomesticFreeTier ? (
                        <span className="mt-0.5 block text-[10px] leading-snug text-(--clay)/50">
                          {formatWearMoney(freeShippingRemainingCents, displayCurrency)} to free shipping (over{" "}
                          {formatWearMoney(WEAR_FREE_SHIPPING_THRESHOLD_CENTS, displayCurrency)} basket — EU, UK and Iceland)
                        </span>
                      ) : null}
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t border-(--clay)/18 pt-3 text-base">
                <dt className="font-semibold text-[var(--clay)]">Estimated total</dt>
                <dd className="font-semibold text-[var(--clay)]">
                  {pricingState === "loading" ? (
                    <span className="inline-block h-4 w-24 animate-pulse rounded bg-(--clay)/12" aria-label="Calculating" />
                  ) : (
                    <>
                      {formatWearMoney(
                        merchandiseAfterDiscountCents + (estimatedShippingMinor ?? 0),
                        displayCurrency,
                      )}
                      <span className="ml-1 text-xs font-normal text-(--clay)/50">
                        {qualifiesForFreeShipping
                          ? "incl. shipping"
                          : estimatedShippingMinor == null
                            ? "merchandise only — pick country for shipping"
                            : "incl. estimated shipping"}
                      </span>
                    </>
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-6 rounded-2xl border border-(--clay)/18 bg-(--clay)/6 px-4 py-4">
              {appliedCoupon ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                      Code applied
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-[var(--clay)]">
                      {appliedCoupon.code}
                      {appliedCoupon.name ? (
                        <span className="font-normal text-(--clay)/65"> — {appliedCoupon.name}</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-(--clay)/55">
                      Saves {formatWearMoney(couponDiscountCents, displayCurrency)}. Locked in before
                      Stripe.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="inline-flex min-h-9 items-center justify-center rounded-full border border-(--clay)/22 bg-(--clay)/8 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--clay)] transition hover:border-(--heat)/50 hover:text-(--heat)"
                    disabled={couponBusy || checkoutBusy}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <label
                    htmlFor="wear-coupon-code"
                    className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--clay)/72"
                  >
                    Have a code?
                  </label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      id="wear-coupon-code"
                      type="text"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      inputMode="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !couponBusy && couponInput.trim()) {
                          e.preventDefault();
                          void applyCoupon();
                        }
                      }}
                      placeholder="ENTER CODE"
                      className="min-h-11 flex-1 rounded-full border border-(--clay)/22 bg-(--ink) px-4 text-sm font-mono uppercase tracking-[0.12em] text-[var(--clay)] placeholder:text-(--clay)/45 focus:border-(--heat) focus:outline-none focus:ring-1 focus:ring-(--heat)"
                      disabled={couponBusy || lines.length === 0 || cartCurrencyIssue != null || checkoutBusy}
                    />
                    <button
                      type="button"
                      onClick={() => void applyCoupon()}
                      disabled={
                        couponBusy ||
                        !couponInput.trim() ||
                        lines.length === 0 ||
                        cartCurrencyIssue != null ||
                        checkoutBusy
                      }
                      className="pm-btn pm-btn--heat inline-flex min-h-11 shrink-0 items-center justify-center px-5 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50"
                    >
                      {couponBusy ? "Checking…" : "Apply"}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-(--clay)/50">
                    Discount locks in here — Stripe charges the discounted total.
                  </p>
                </>
              )}
              {couponError ? (
                <p
                  className="mt-3 text-xs font-medium text-red-400"
                  role="alert"
                  aria-live="polite"
                >
                  {couponError}
                </p>
              ) : null}
            </div>

            {pricingState === "error" ? (
              <p className="mt-3 rounded-xl border border-(--heat)/35 bg-(--heat)/10 px-4 py-3 text-xs leading-relaxed text-[var(--clay)]">
                We couldn’t reach the pricing service — totals shown are based on your local cart. You can still continue to checkout to confirm the final amount before paying.
              </p>
            ) : null}

            <p className="mt-3 text-xs leading-relaxed text-(--clay)/72">{WEAR_SHIPPING_CART_NOTE}</p>

            {checkoutError ? <p className="mt-4 text-sm text-red-400">{checkoutError}</p> : null}

            {cartCurrencyIssue ? (
              <p className="mt-4 rounded-xl border border-(--heat)/35 bg-(--heat)/12 px-4 py-3 text-sm text-[var(--clay)]">
                {cartCurrencyIssue === "mixed"
                  ? "This cart mixes currencies. Adjust quantities or remove lines so every item uses the same currency before checkout."
                  : `The public wear shop is priced in ${WEAR_LISTING_CURRENCY}. Remove non-${WEAR_LISTING_CURRENCY} items to continue.`}
              </p>
            ) : null}

            <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-(--clay)/50">
              Secure Stripe · {WEAR_SHIPPING_TRUST_STRIP}
            </p>

            <button
              type="button"
              disabled={
                checkoutBusy ||
                couponBusy ||
                !catalogReady ||
                lines.length === 0 ||
                linesInvalid ||
                cartCurrencyIssue != null ||
                pricingState === "loading" ||
                !shipToCountry
              }
              onClick={onCheckout}
              className="pm-btn pm-btn--heat mt-4 w-full min-h-14 px-6 text-sm font-semibold uppercase tracking-[0.14em] disabled:opacity-50"
            >
              {checkoutBusy
                ? "Redirecting…"
                : pricingState === "loading"
                  ? "Calculating…"
                  : !shipToCountry
                    ? "Choose delivery country"
                    : `Pay ${formatWearMoney(
                        merchandiseAfterDiscountCents + (estimatedShippingMinor ?? 0),
                        displayCurrency,
                      )} → checkout`}
            </button>
            <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-(--clay)/50">
              Apple Pay · Google Pay · Card · Link
            </p>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-(--clay)/50">{WEAR_CURRENCY_POLICY_FULL}</p>
          </>
        ) : null}

        {lines.length > 0 ? (
          <p className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => router.push("/wear/shop")}
              className="pm-btn pm-btn--ghost inline-flex min-h-11 items-center justify-center px-5 text-sm font-medium"
            >
              ← Continue shopping
            </button>
          </p>
        ) : null}
      </div>
    </main>
  );
}
