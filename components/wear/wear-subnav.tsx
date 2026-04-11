"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  WEAR_CART_CHANGED_EVENT,
  WEAR_CART_STORAGE_KEY,
  parseWearCart,
} from "@/lib/wear-cart";

const linkBase =
  "text-xs font-medium uppercase tracking-[0.2em] text-stone-500 transition hover:text-amber-950";
const linkOn = "text-amber-950";

function cartItemCount(): number {
  if (typeof window === "undefined") return 0;
  const lines = parseWearCart(localStorage.getItem(WEAR_CART_STORAGE_KEY));
  return lines.reduce((n, l) => n + l.quantity, 0);
}

export function WearSubnav({ initialCount = 0 }: { initialCount?: number }) {
  const pathname = usePathname() || "/wear";
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    function sync() {
      setCount(cartItemCount());
    }
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(WEAR_CART_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(WEAR_CART_CHANGED_EVENT, sync);
    };
  }, [initialCount]);

  return (
    <div className="border-b border-stone-200/80 bg-white/90 text-(--brand-ink) backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-4 sm:justify-between sm:px-6">
        <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2" aria-label="Wear">
          <Link href="/wear" className={pathname === "/wear" ? `${linkBase} ${linkOn}` : linkBase}>
            Identity
          </Link>
          <Link
            href="/wear/shop"
            className={pathname.startsWith("/wear/shop") ? `${linkBase} ${linkOn}` : linkBase}
          >
            Shop
          </Link>
          <Link
            href="/wear/cart"
            className={pathname.startsWith("/wear/cart") ? `${linkBase} ${linkOn}` : linkBase}
          >
            Cart{count > 0 ? <span className="ml-1.5 text-stone-700">({count})</span> : null}
          </Link>
        </nav>
        <p className="hidden text-center text-[11px] uppercase tracking-[0.25em] text-stone-500 sm:block">
          PotteryMania wear
        </p>
      </div>
    </div>
  );
}
