"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  WEAR_CART_ITEM_ADDED_EVENT,
  parseWearCart,
  WEAR_CART_STORAGE_KEY,
} from "@/lib/wear-cart";

/** Once the shopper adds a wear line (this tab), stop fake social proof for the session. */
const SESSION_DISMISS_KEY = "pm_wear_home_social_proof_dismissed";

function wearLocalCartUnits(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseWearCart(localStorage.getItem(WEAR_CART_STORAGE_KEY)).reduce((s, l) => s + l.quantity, 0);
  } catch {
    return 0;
  }
}

function shouldDismissSocialProof(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "1") return true;
  return wearLocalCartUnits() > 0;
}

const FIRST_NAMES = [
  "Maya",
  "Jonas",
  "Sofia",
  "Leo",
  "Nina",
  "Theo",
  "Zara",
  "Emil",
  "Ava",
  "Noah",
  "Iris",
  "Marco",
  "Elena",
  "Felix",
] as const;

/**
 * City + country for the “where they’re from” plug.
 * Matches `WEAR_CHECKOUT_SHIPPING_COUNTRIES` in `lib/wear-shipping.ts` (EU + IS + GB + CA + AU; no US).
 */
const LOCATIONS = [
  { city: "Vienna", country: "Austria" },
  { city: "Graz", country: "Austria" },
  { city: "Salzburg", country: "Austria" },
  { city: "Innsbruck", country: "Austria" },
  { city: "Linz", country: "Austria" },
  { city: "Brussels", country: "Belgium" },
  { city: "Antwerp", country: "Belgium" },
  { city: "Ghent", country: "Belgium" },
  { city: "Liège", country: "Belgium" },
  { city: "Sofia", country: "Bulgaria" },
  { city: "Plovdiv", country: "Bulgaria" },
  { city: "Varna", country: "Bulgaria" },
  { city: "Zagreb", country: "Croatia" },
  { city: "Split", country: "Croatia" },
  { city: "Rijeka", country: "Croatia" },
  { city: "Osijek", country: "Croatia" },
  { city: "Nicosia", country: "Cyprus" },
  { city: "Limassol", country: "Cyprus" },
  { city: "Larnaca", country: "Cyprus" },
  { city: "Prague", country: "Czechia" },
  { city: "Brno", country: "Czechia" },
  { city: "Ostrava", country: "Czechia" },
  { city: "České Budějovice", country: "Czechia" },
  { city: "Copenhagen", country: "Denmark" },
  { city: "Aarhus", country: "Denmark" },
  { city: "Odense", country: "Denmark" },
  { city: "Aalborg", country: "Denmark" },
  { city: "Tallinn", country: "Estonia" },
  { city: "Tartu", country: "Estonia" },
  { city: "Pärnu", country: "Estonia" },
  { city: "Helsinki", country: "Finland" },
  { city: "Tampere", country: "Finland" },
  { city: "Turku", country: "Finland" },
  { city: "Oulu", country: "Finland" },
  { city: "Paris", country: "France" },
  { city: "Lyon", country: "France" },
  { city: "Marseille", country: "France" },
  { city: "Toulouse", country: "France" },
  { city: "Nice", country: "France" },
  { city: "Nantes", country: "France" },
  { city: "Strasbourg", country: "France" },
  { city: "Bordeaux", country: "France" },
  { city: "Lille", country: "France" },
  { city: "Berlin", country: "Germany" },
  { city: "Munich", country: "Germany" },
  { city: "Hamburg", country: "Germany" },
  { city: "Cologne", country: "Germany" },
  { city: "Frankfurt", country: "Germany" },
  { city: "Stuttgart", country: "Germany" },
  { city: "Dresden", country: "Germany" },
  { city: "Leipzig", country: "Germany" },
  { city: "Nuremberg", country: "Germany" },
  { city: "Hanover", country: "Germany" },
  { city: "Athens", country: "Greece" },
  { city: "Thessaloniki", country: "Greece" },
  { city: "Patras", country: "Greece" },
  { city: "Heraklion", country: "Greece" },
  { city: "Budapest", country: "Hungary" },
  { city: "Debrecen", country: "Hungary" },
  { city: "Szeged", country: "Hungary" },
  { city: "Dublin", country: "Ireland" },
  { city: "Cork", country: "Ireland" },
  { city: "Galway", country: "Ireland" },
  { city: "Limerick", country: "Ireland" },
  { city: "Rome", country: "Italy" },
  { city: "Milan", country: "Italy" },
  { city: "Naples", country: "Italy" },
  { city: "Turin", country: "Italy" },
  { city: "Florence", country: "Italy" },
  { city: "Bologna", country: "Italy" },
  { city: "Verona", country: "Italy" },
  { city: "Padua", country: "Italy" },
  { city: "Riga", country: "Latvia" },
  { city: "Daugavpils", country: "Latvia" },
  { city: "Liepāja", country: "Latvia" },
  { city: "Vilnius", country: "Lithuania" },
  { city: "Kaunas", country: "Lithuania" },
  { city: "Klaipėda", country: "Lithuania" },
  { city: "Luxembourg", country: "Luxembourg" },
  { city: "Esch-sur-Alzette", country: "Luxembourg" },
  { city: "Valletta", country: "Malta" },
  { city: "Sliema", country: "Malta" },
  { city: "St. Julian's", country: "Malta" },
  { city: "Amsterdam", country: "Netherlands" },
  { city: "Rotterdam", country: "Netherlands" },
  { city: "The Hague", country: "Netherlands" },
  { city: "Utrecht", country: "Netherlands" },
  { city: "Eindhoven", country: "Netherlands" },
  { city: "Groningen", country: "Netherlands" },
  { city: "Warsaw", country: "Poland" },
  { city: "Kraków", country: "Poland" },
  { city: "Wrocław", country: "Poland" },
  { city: "Gdańsk", country: "Poland" },
  { city: "Poznań", country: "Poland" },
  { city: "Łódź", country: "Poland" },
  { city: "Lisbon", country: "Portugal" },
  { city: "Porto", country: "Portugal" },
  { city: "Braga", country: "Portugal" },
  { city: "Coimbra", country: "Portugal" },
  { city: "Faro", country: "Portugal" },
  { city: "Bucharest", country: "Romania" },
  { city: "Cluj-Napoca", country: "Romania" },
  { city: "Timișoara", country: "Romania" },
  { city: "Iași", country: "Romania" },
  { city: "Brașov", country: "Romania" },
  { city: "Bratislava", country: "Slovakia" },
  { city: "Košice", country: "Slovakia" },
  { city: "Prešov", country: "Slovakia" },
  { city: "Ljubljana", country: "Slovenia" },
  { city: "Maribor", country: "Slovenia" },
  { city: "Koper", country: "Slovenia" },
  { city: "Madrid", country: "Spain" },
  { city: "Barcelona", country: "Spain" },
  { city: "Valencia", country: "Spain" },
  { city: "Seville", country: "Spain" },
  { city: "Bilbao", country: "Spain" },
  { city: "Zaragoza", country: "Spain" },
  { city: "Málaga", country: "Spain" },
  { city: "Granada", country: "Spain" },
  { city: "Stockholm", country: "Sweden" },
  { city: "Gothenburg", country: "Sweden" },
  { city: "Malmö", country: "Sweden" },
  { city: "Uppsala", country: "Sweden" },
  { city: "Linköping", country: "Sweden" },
  { city: "Reykjavík", country: "Iceland" },
  { city: "Akureyri", country: "Iceland" },
  { city: "Kópavogur", country: "Iceland" },
  { city: "London", country: "United Kingdom" },
  { city: "Manchester", country: "United Kingdom" },
  { city: "Edinburgh", country: "United Kingdom" },
  { city: "Birmingham", country: "United Kingdom" },
  { city: "Bristol", country: "United Kingdom" },
  { city: "Leeds", country: "United Kingdom" },
  { city: "Glasgow", country: "United Kingdom" },
  { city: "Cardiff", country: "United Kingdom" },
  { city: "Belfast", country: "United Kingdom" },
  { city: "Brighton", country: "United Kingdom" },
  { city: "Toronto", country: "Canada" },
  { city: "Vancouver", country: "Canada" },
  { city: "Montreal", country: "Canada" },
  { city: "Calgary", country: "Canada" },
  { city: "Ottawa", country: "Canada" },
  { city: "Halifax", country: "Canada" },
  { city: "Victoria", country: "Canada" },
  { city: "Winnipeg", country: "Canada" },
  { city: "Quebec City", country: "Canada" },
  { city: "Saskatoon", country: "Canada" },
  { city: "Regina", country: "Canada" },
  { city: "London", country: "Canada" },
  { city: "Kelowna", country: "Canada" },
  { city: "St. John's", country: "Canada" },
  { city: "Sydney", country: "Australia" },
  { city: "Melbourne", country: "Australia" },
  { city: "Brisbane", country: "Australia" },
  { city: "Perth", country: "Australia" },
  { city: "Adelaide", country: "Australia" },
  { city: "Hobart", country: "Australia" },
  { city: "Canberra", country: "Australia" },
  { city: "Newcastle", country: "Australia" },
  { city: "Gold Coast", country: "Australia" },
  { city: "Wollongong", country: "Australia" },
  { city: "Darwin", country: "Australia" },
  { city: "Cairns", country: "Australia" },
  { city: "Geelong", country: "Australia" },
  { city: "Launceston", country: "Australia" },
] as const;

/** Real drop-wall style names (matches public catalog tone). */
const CATALOG_ITEMS = [
  { line: "Ceramics · Organic T-shirt" },
  { line: "Ceramics Urban Design · T-shirt" },
  { line: "Minimalistic Pottery Design · Organic T-shirt" },
  { line: "Mud In My Veins · T-shirt" },
  { line: "Pot Dealer · T-shirt" },
  { line: "Pottery Psychedelic · T-shirt" },
  { line: "Abstract Design · Organic T-shirt" },
  { line: "Pottery Reflection Softstyle® Midweight · Hoodie" },
  { line: "Pottery Artist Softstyle® Midweight · Hoodie" },
  { line: "Ceramics · Heavyweight tee" },
  { line: "Studio mark · tee" },
  { line: "Hands in the clay · longsleeve" },
  { line: "Build your space · hoodie" },
  { line: "Quiet kiln · cap" },
] as const;

const SIZES = ["S", "M", "L", "XL"] as const;

const VERBS = ["just ordered", "picked up", "grabbed", "checked out with", "snagged"] as const;

const PLACEMENTS = ["bottom-left", "bottom-right", "top-left", "top-right"] as const;
type Placement = (typeof PLACEMENTS)[number];

function WearSocialProofBagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M8 8V6a4 4 0 1 1 8 0v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M5 9h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 9z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function pick<T extends readonly unknown[]>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickDistinctPair(): [typeof CATALOG_ITEMS[number], typeof CATALOG_ITEMS[number]] {
  const a = pick(CATALOG_ITEMS);
  let b = pick(CATALOG_ITEMS);
  let guard = 0;
  while (b.line === a.line && guard++ < 12) {
    b = pick(CATALOG_ITEMS);
  }
  return [a, b];
}

type ToastPayload = {
  placement: Placement;
  /** Single message line as JSX (product names emphasized). */
  body: ReactNode;
  /** Hidden-state motion (slide from edge). */
  motionHidden: string;
};

function buildToast(): ToastPayload {
  const loc = pick(LOCATIONS);
  const placement = pick(PLACEMENTS);
  const verb = pick(VERBS);
  const size = pick(SIZES);
  const double = Math.random() < 0.14;

  const motionHidden =
    placement === "bottom-left"
      ? "-translate-x-10 opacity-0"
      : placement === "bottom-right"
        ? "translate-x-10 opacity-0"
        : placement === "top-left"
          ? "-translate-y-8 -translate-x-6 opacity-0"
          : "-translate-y-8 translate-x-6 opacity-0";

  if (double) {
    const [a, b] = pickDistinctPair();
    const name = pick(FIRST_NAMES);
    return {
      placement,
      motionHidden,
      body: (
        <>
          <strong className="font-semibold text-stone-900">{name}</strong>
          <span>
            {" "}
            in <strong className="font-semibold text-stone-900">{loc.city}</strong>,{" "}
            <strong className="font-semibold text-amber-950">{loc.country}</strong>
            {" — "}
            {verb}{" "}
            <strong className="font-semibold text-stone-900">{a.line}</strong>
            {" + "}
            <strong className="font-semibold text-stone-900">{b.line}</strong>.
          </span>
        </>
      ),
    };
  }

  const item = pick(CATALOG_ITEMS);
  const useName = Math.random() > 0.28;

  if (useName) {
    const name = pick(FIRST_NAMES);
    return {
      placement,
      motionHidden,
      body: (
        <>
          <strong className="font-semibold text-stone-900">{name}</strong>
          <span>
            {" "}
            in <strong className="font-semibold text-stone-900">{loc.city}</strong>,{" "}
            <strong className="font-semibold text-amber-950">{loc.country}</strong>
            {" — "}
            {verb}{" "}
            <strong className="font-semibold text-stone-900">{item.line}</strong>
            <span className="text-stone-700 tabular-nums"> ({size})</span>.
          </span>
        </>
      ),
    };
  }

  return {
    placement,
    motionHidden,
    body: (
      <>
        <span>Someone in </span>
        <strong className="font-semibold text-stone-900">{loc.city}</strong>
        <span>, </span>
        <strong className="font-semibold text-amber-950">{loc.country}</strong>
        <span>
          {" "}
          {verb}{" "}
          <strong className="font-semibold text-stone-900">{item.line}</strong>
          <span className="text-stone-700 tabular-nums"> ({size})</span>.
        </span>
      </>
    ),
  };
}

function placementWrapperClass(placement: Placement): string {
  const base = "z-[90] max-w-[min(100vw-2rem,22rem)]";
  switch (placement) {
    case "bottom-left":
      return `fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-4 ${base} sm:bottom-8 sm:left-6`;
    case "bottom-right":
      return `fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] right-4 ${base} sm:bottom-8 sm:right-6`;
    case "top-left":
      return `fixed top-[calc(env(safe-area-inset-top,0px)+5.5rem)] left-4 ${base} sm:top-28 sm:left-6`;
    case "top-right":
      return `fixed top-[calc(env(safe-area-inset-top,0px)+5.5rem)] right-4 ${base} sm:top-28 sm:right-6`;
    default:
      return `fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-4 ${base}`;
  }
}

const SHOW_MS = 6200;
const FIRST_DELAY_MS_MIN = 9000;
const FIRST_DELAY_MS_MAX = 18000;
const BETWEEN_MS_MIN = 38000;
const BETWEEN_MS_MAX = 68000;

/**
 * Fake “recent purchase” nudges (no backend). Homepage (`/`) only.
 * Random corner placement, city + country, catalog-style product names.
 * Stops for this browser tab after the shopper adds a wear item to the bag (or if the bag already has lines).
 * Hidden when `prefers-reduced-motion: reduce`.
 */
export function WearSocialProofToast() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const timersRef = useRef<{ ids: ReturnType<typeof setTimeout>[] }>({ ids: [] });

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current.ids) clearTimeout(id);
    timersRef.current.ids = [];
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (shouldDismissSocialProof()) {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const onAdded = () => {
      try {
        sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
      clearTimers();
      setDismissed(true);
      setVisible(false);
      setToast(null);
    };
    window.addEventListener(WEAR_CART_ITEM_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(WEAR_CART_ITEM_ADDED_EVENT, onAdded);
  }, [mounted, clearTimers]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined" || dismissed) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const scheduleNext = (delayMs: number) => {
      const id = setTimeout(() => {
        if (shouldDismissSocialProof()) {
          setDismissed(true);
          return;
        }
        if (document.visibilityState === "hidden") {
          scheduleNext(15_000);
          return;
        }
        setToast(buildToast());
        setVisible(true);
        const hideId = setTimeout(() => setVisible(false), SHOW_MS);
        timersRef.current.ids.push(hideId);
        const nextDelay = BETWEEN_MS_MIN + Math.random() * (BETWEEN_MS_MAX - BETWEEN_MS_MIN);
        scheduleNext(nextDelay);
      }, delayMs);
      timersRef.current.ids.push(id);
    };

    const first =
      FIRST_DELAY_MS_MIN + Math.random() * (FIRST_DELAY_MS_MAX - FIRST_DELAY_MS_MIN);
    scheduleNext(first);

    return () => clearTimers();
  }, [mounted, dismissed, clearTimers]);

  if (!mounted || !toast) return null;

  const motionVisible = "translate-x-0 translate-y-0 opacity-100 scale-100";
  const motionClass = visible ? motionVisible : toast.motionHidden;

  return createPortal(
    <div className={`pointer-events-none ${placementWrapperClass(toast.placement)}`} aria-hidden="true">
      <div className="pointer-events-none relative">
        <div
          aria-hidden
          className={`pointer-events-none absolute -inset-px rounded-[15px] border border-amber-400/45 transition-opacity duration-500 ease-out ${
            visible ? "animate-pulse opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`pointer-events-none relative overflow-hidden rounded-2xl border border-stone-300/85 bg-white/97 px-4 py-3 shadow-[0_1px_0_0_rgba(251,191,36,0.22)_inset,0_14px_44px_-12px_rgba(28,25,23,0.32),0_0_0_1px_rgba(120,113,108,0.07)] backdrop-blur-md transition-all duration-500 ease-out ${motionClass}`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-linear-to-br from-amber-100/35 via-transparent to-stone-200/25 opacity-80"
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-stone-900/5 ring-inset" />
          <div className="relative flex gap-3">
            <div className="mt-0.5 shrink-0 text-amber-900/85">
              <WearSocialProofBagIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-950/88">Live drop</p>
                <span
                  aria-hidden
                  className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(255,255,255,0.96)] ring-2 ring-emerald-600/25"
                />
              </div>
              <p className="mt-2 text-[13px] font-normal leading-snug tracking-[-0.01em] text-stone-800 antialiased">
                {toast.body}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
