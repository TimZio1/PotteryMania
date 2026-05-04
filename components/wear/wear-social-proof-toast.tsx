"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

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
] as const;

const PLACES = [
  "Berlin",
  "Barcelona",
  "Amsterdam",
  "Dublin",
  "Vienna",
  "Prague",
  "Milan",
  "Lisbon",
  "Hamburg",
  "Copenhagen",
  "Stockholm",
  "Brussels",
  "Munich",
  "Marseille",
  "Kraków",
  "Reykjavik",
  "Edinburgh",
] as const;

const PRODUCT_SNIPPETS = [
  "a tee from the drop",
  "a zip hoodie",
  "a relaxed-fit tee",
  "a crewneck",
  "a graphic tee",
  "something from the wall",
  "a PotteryMania staple",
  "a hoodie",
  "the organic tee",
  "a short-sleeve piece",
] as const;

const VERBS = ["just grabbed", "picked up", "snagged", "ordered", "checked out with"] as const;

function pick<T extends readonly string[]>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function buildLine(): string {
  const useName = Math.random() > 0.35;
  const place = pick(PLACES);
  const product = pick(PRODUCT_SNIPPETS);
  const verb = pick(VERBS);
  if (useName) {
    return `${pick(FIRST_NAMES)} from ${place} ${verb} ${product}.`;
  }
  return `Someone in ${place} ${verb} ${product}.`;
}

const SHOW_MS = 5200;
const FIRST_DELAY_MS_MIN = 9000;
const FIRST_DELAY_MS_MAX = 18000;
const BETWEEN_MS_MIN = 38000;
const BETWEEN_MS_MAX = 68000;

/**
 * Lightweight fake “recent purchase” nudges (no backend). Render on the marketing
 * homepage (`/`) only — not `/wear`, shop, PDP, or cart.
 * Hidden when `prefers-reduced-motion: reduce`.
 */
export function WearSocialProofToast() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [line, setLine] = useState("");
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
        setLine(buildLine());
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

  if (!mounted || !line) return null;

  const motionClass = visible ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0";

  return createPortal(
    <div
      className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-4 z-[90] max-w-[min(100vw-2rem,20rem)] sm:left-6 sm:bottom-8"
      aria-hidden="true"
    >
      <div
        className={`pointer-events-none rounded-2xl border border-stone-200/90 bg-white/95 px-3.5 py-2.5 shadow-[0_10px_36px_-10px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-[opacity,transform] duration-500 ease-out ${motionClass}`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900/90">Live drop</p>
        <p className="mt-1 text-xs leading-snug text-stone-700">{line}</p>
      </div>
    </div>,
    document.body,
  );
}
