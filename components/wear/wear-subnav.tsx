"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  WEAR_CART_CHANGED_EVENT,
  WEAR_CART_STORAGE_KEY,
  parseWearCart,
} from "@/lib/wear-cart";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";

const linkBase =
  "inline-flex min-h-11 items-center px-2 py-2 !text-stone-800 text-xs font-medium uppercase tracking-[0.2em] transition hover:!text-stone-950";
const linkOn = "font-semibold !text-amber-900";

function cartItemCount(): number {
  if (typeof window === "undefined") return 0;
  const lines = parseWearCart(localStorage.getItem(WEAR_CART_STORAGE_KEY));
  return lines.reduce((n, l) => n + l.quantity, 0);
}

export function WearSubnav({ initialCount = 0 }: { initialCount?: number }) {
  const pathname = usePathname() || "/wear";
  const [count, setCount] = useState(initialCount);
  const apparelOnly = isApparelOnlyLaunch();

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
    <div className="border-b border-stone-200/90 bg-white/95 !text-stone-900 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-2 sm:justify-between sm:px-6 sm:py-3">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:gap-x-6" aria-label="Shop">
          <Link
            href={apparelOnly ? "/" : "/wear"}
            className={(apparelOnly ? pathname === "/" : pathname === "/wear") ? `${linkBase} ${linkOn}` : linkBase}
          >
            {apparelOnly ? "Home" : "Drop"}
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
            Cart{count > 0 ? <span className="ml-1.5 font-medium !text-stone-900">({count})</span> : null}
          </Link>
          <Link
            href="/wear/partner"
            className={pathname.startsWith("/wear/partner") ? `${linkBase} ${linkOn}` : linkBase}
          >
            {apparelOnly ? "Affiliate" : "Partner"}
          </Link>
        </nav>
        <p className="hidden text-center text-[11px] font-medium uppercase tracking-[0.25em] !text-stone-700 sm:block">
          {apparelOnly ? "Makers apparel" : "Apparel"}
        </p>
      </div>
    </div>
  );
}
