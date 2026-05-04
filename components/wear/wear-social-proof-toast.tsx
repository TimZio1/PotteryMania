"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

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

/** City + country — country is called out for the “where they’re from” plug. */
const LOCATIONS = [
  { city: "Berlin", country: "Germany" },
  { city: "Munich", country: "Germany" },
  { city: "Hamburg", country: "Germany" },
  { city: "Barcelona", country: "Spain" },
  { city: "Madrid", country: "Spain" },
  { city: "Lisbon", country: "Portugal" },
  { city: "Porto", country: "Portugal" },
  { city: "Amsterdam", country: "Netherlands" },
  { city: "Rotterdam", country: "Netherlands" },
  { city: "Dublin", country: "Ireland" },
  { city: "Cork", country: "Ireland" },
  { city: "Vienna", country: "Austria" },
  { city: "Prague", country: "Czechia" },
  { city: "Milan", country: "Italy" },
  { city: "Rome", country: "Italy" },
  { city: "Brussels", country: "Belgium" },
  { city: "Paris", country: "France" },
  { city: "Marseille", country: "France" },
  { city: "Lyon", country: "France" },
  { city: "Copenhagen", country: "Denmark" },
  { city: "Stockholm", country: "Sweden" },
  { city: "Kraków", country: "Poland" },
  { city: "Warsaw", country: "Poland" },
  { city: "Reykjavik", country: "Iceland" },
  { city: "Edinburgh", country: "United Kingdom" },
  { city: "Manchester", country: "United Kingdom" },
  { city: "London", country: "United Kingdom" },
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
            <span className="text-stone-600"> ({size})</span>.
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
          <span className="text-stone-600"> ({size})</span>.
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
 * Hidden when `prefers-reduced-motion: reduce`.
 */
export function WearSocialProofToast() {
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const scheduleNext = (delayMs: number) => {
      const id = setTimeout(() => {
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
  }, [mounted, clearTimers]);

  if (!mounted || !toast) return null;

  const motionVisible = "translate-x-0 translate-y-0 opacity-100 scale-100";
  const motionClass = visible ? motionVisible : toast.motionHidden;

  return createPortal(
    <div className={`pointer-events-none ${placementWrapperClass(toast.placement)}`} aria-hidden="true">
      <div
        className={`pointer-events-none rounded-2xl border border-stone-200/90 bg-white/95 px-3.5 py-2.5 shadow-[0_10px_36px_-10px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-all duration-500 ease-out ${motionClass}`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900/90">Live drop</p>
        <p className="mt-1 text-xs leading-snug text-stone-700">{toast.body}</p>
      </div>
    </div>,
    document.body,
  );
}
