"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Scroll milestones + time on /wear for GA4 when NEXT_PUBLIC_GA_ID is set. */
export function WearAnalytics() {
  const startRef = useRef(Date.now());
  const firedRef = useRef({ p25: false, p50: false, p100: false });
  const maxScrollRef = useRef(0);

  useEffect(() => {
    startRef.current = Date.now();

    function docHeight() {
      const el = document.documentElement;
      return Math.max(el.scrollHeight, el.offsetHeight) - window.innerHeight;
    }

    function onScroll() {
      const dh = docHeight();
      if (dh <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / dh) * 100));
      maxScrollRef.current = Math.max(maxScrollRef.current, pct);
      const g = typeof window !== "undefined" ? window.gtag : undefined;
      if (!g) return;
      if (!firedRef.current.p25 && pct >= 25) {
        firedRef.current.p25 = true;
        g("event", "wear_scroll_depth", { event_category: "wear", percent_scrolled: 25 });
      }
      if (!firedRef.current.p50 && pct >= 50) {
        firedRef.current.p50 = true;
        g("event", "wear_scroll_depth", { event_category: "wear", percent_scrolled: 50 });
      }
      if (!firedRef.current.p100 && pct >= 98) {
        firedRef.current.p100 = true;
        g("event", "wear_scroll_depth", { event_category: "wear", percent_scrolled: 100 });
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      const g = typeof window !== "undefined" ? window.gtag : undefined;
      if (g) {
        const seconds = Math.round((Date.now() - startRef.current) / 1000);
        g("event", "wear_time_on_page", {
          event_category: "wear",
          value: seconds,
          max_scroll_percent: maxScrollRef.current,
        });
      }
    };
  }, []);

  return null;
}
