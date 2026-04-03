"use client";

import { useEffect, useState } from "react";
import { promoTimeLeft, PROMO_LABEL } from "@/lib/promo";

export function PromoCountdown({ className = "" }: { className?: string }) {
  const [tl, setTl] = useState(promoTimeLeft());

  useEffect(() => {
    const id = setInterval(() => setTl(promoTimeLeft()), 1_000);
    return () => clearInterval(id);
  }, []);

  if (tl.expired) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className={`flex items-center gap-2 text-xs text-stone-500 ${className}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
      <span>
        {PROMO_LABEL} — <span className="tabular-nums font-medium text-stone-700">{tl.days}d {pad(tl.hours)}h {pad(tl.minutes)}m {pad(tl.seconds)}s</span>
      </span>
    </div>
  );
}

export function PromoCountdownCompact() {
  const [tl, setTl] = useState(promoTimeLeft());

  useEffect(() => {
    const id = setInterval(() => setTl(promoTimeLeft()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (tl.expired) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
      <span className="inline-block h-1 w-1 rounded-full bg-emerald-500" aria-hidden />
      Free — {tl.days}d left
    </span>
  );
}
