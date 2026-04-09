"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/cn";
import { allCeramicCategories } from "@/lib/ceramic-categories";
import { ui } from "@/lib/ui-styles";

function adminVisible(role: string | undefined) {
  return role === "admin" || role === "hyper_admin";
}

function wearZoneActive(pathname: string) {
  return pathname === "/wear" || pathname.startsWith("/wear/");
}

function useWearCartCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("wear-cart");
      if (raw) {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [];
        setCount(items.reduce((n: number, i: { qty?: number }) => n + (i.qty ?? 1), 0));
      }
    } catch {
      /* empty */
    }
    const onStorage = () => {
      try {
        const raw = localStorage.getItem("wear-cart");
        if (raw) {
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed) ? parsed : [];
          setCount(items.reduce((n: number, i: { qty?: number }) => n + (i.qty ?? 1), 0));
        } else {
          setCount(0);
        }
      } catch {
        /* empty */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return count;
}

function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-900 px-1.5 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

type SiteHeaderProps = {
  showPublicSignIn?: boolean;
};

const SHIPPING_REGION_OPTIONS = [
  { value: "domestic", label: "Domestic" },
  { value: "europe", label: "Europe" },
  { value: "usa", label: "USA" },
  { value: "canada", label: "Canada" },
  { value: "asia", label: "Asia" },
] as const;

export function SiteHeader({ showPublicSignIn = true }: SiteHeaderProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wearCount = useWearCartCount();
  const [region, setRegion] = useState<string>("europe");

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/geo/region", { cache: "no-store" });
        const data = (await res.json()) as { region?: string };
        if (typeof data.region === "string") setRegion(data.region);
      } catch {
        /* noop */
      }
    })();
  }, []);

  const authed = status === "authenticated" && session?.user;
  const role = session?.user?.role;

  const linkClass = (href: string) =>
    cn(
      ui.buttonGhost,
      pathname === href || (href !== "/" && pathname.startsWith(href + "/"))
        ? "bg-amber-50 text-amber-950"
        : "",
    );

  const mobileLinkClass = (href: string) =>
    cn(
      ui.buttonGhost,
      "min-h-12 justify-start px-4 text-base",
      pathname === href || (href !== "/" && pathname.startsWith(href + "/"))
        ? "bg-amber-50 text-amber-950"
        : "",
    );

  const mobileWearClass = cn(
    ui.buttonGhost,
    "min-h-12 justify-start px-4 text-base",
    wearZoneActive(pathname) ? "bg-amber-50 text-amber-950" : "",
  );
  const ceramicCategories = allCeramicCategories();

  async function updateRegion(next: string) {
    setRegion(next);
    try {
      await fetch("/api/geo/region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: next }),
      });
    } catch {
      /* noop */
    }
    window.location.reload();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-(--brand-line) bg-[rgba(250,248,245,0.88)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-18 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-700 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {open ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
          <BrandLogo className="min-w-0 truncate text-(--brand-ink)" />
        </div>

        <nav className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-2" aria-label="Primary">
          <label className="hidden items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 md:inline-flex">
            <span>Ship to</span>
            <select
              className="bg-transparent text-xs font-medium outline-none"
              value={region}
              onChange={(e) => void updateRegion(e.target.value)}
              aria-label="Shipping region"
            >
              {SHIPPING_REGION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {authed ? (
            <div className="hidden items-center gap-1 md:flex">
              <Link href="/marketplace" className={linkClass("/marketplace")}>
                Shop
              </Link>
              <Link href="/classes" className={linkClass("/classes")}>
                Classes
              </Link>
              <div className="group relative">
                <Link
                  href="/category/tableware"
                  className={cn(
                    ui.buttonGhost,
                    pathname.startsWith("/category/") ? "bg-amber-50 text-amber-950" : "",
                  )}
                >
                  Shop by Category
                </Link>
                <div className="invisible absolute left-0 top-[calc(100%+8px)] z-50 w-[560px] rounded-2xl border border-stone-200 bg-white p-3 opacity-0 shadow-xl transition duration-150 group-hover:visible group-hover:opacity-100">
                  <div className="grid grid-cols-2 gap-2">
                    {ceramicCategories.map((category) => (
                      <Link
                        key={category.slug}
                        href={`/category/${category.slug}`}
                        className="group/category flex items-center gap-2 rounded-xl border border-stone-100 p-2 transition hover:scale-[1.01] hover:shadow-sm"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={category.imageUrl}
                          alt={category.title}
                          className="h-10 w-10 rounded-lg object-cover"
                          loading="lazy"
                        />
                        <div>
                          <p className="text-sm font-medium text-stone-900">{category.title}</p>
                          <p className="text-xs text-stone-500">{category.shortDescription}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <Link
                href="/wear/shop"
                className={cn(ui.buttonGhost, wearZoneActive(pathname) ? "bg-amber-50 text-amber-950" : "")}
              >
                Wearables
                <CartBadge count={wearCount} />
              </Link>
              <Link href="/cart" className={linkClass("/cart")}>
                Cart
              </Link>
              <Link href="/dashboard" className={linkClass("/dashboard")}>
                Dashboard
              </Link>
              <Link href="/my-bookings" className={linkClass("/my-bookings")}>
                My bookings
              </Link>
              <Link href="/account" className={linkClass("/account")}>
                Account
              </Link>
              {adminVisible(role) ? (
                <Link href="/admin" className={linkClass("/admin")}>
                  Admin
                </Link>
              ) : null}
              <button
                type="button"
                className={cn(ui.buttonGhost, "text-stone-600")}
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <div className="hidden items-center gap-1 md:flex">
                <Link href="/marketplace" className={linkClass("/marketplace")}>
                  Shop
                </Link>
                <Link href="/classes" className={linkClass("/classes")}>
                  Classes
                </Link>
                <div className="group relative">
                  <Link
                    href="/category/tableware"
                    className={cn(
                      ui.buttonGhost,
                      pathname.startsWith("/category/") ? "bg-amber-50 text-amber-950" : "",
                    )}
                  >
                    Shop by Category
                  </Link>
                  <div className="invisible absolute left-0 top-[calc(100%+8px)] z-50 w-[560px] rounded-2xl border border-stone-200 bg-white p-3 opacity-0 shadow-xl transition duration-150 group-hover:visible group-hover:opacity-100">
                    <div className="grid grid-cols-2 gap-2">
                      {ceramicCategories.map((category) => (
                        <Link
                          key={category.slug}
                          href={`/category/${category.slug}`}
                          className="group/category flex items-center gap-2 rounded-xl border border-stone-100 p-2 transition hover:scale-[1.01] hover:shadow-sm"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={category.imageUrl}
                            alt={category.title}
                            className="h-10 w-10 rounded-lg object-cover"
                            loading="lazy"
                          />
                          <div>
                            <p className="text-sm font-medium text-stone-900">{category.title}</p>
                            <p className="text-xs text-stone-500">{category.shortDescription}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
                <Link
                  href="/wear/shop"
                  className={cn(ui.buttonGhost, wearZoneActive(pathname) ? "bg-amber-50 text-amber-950" : "")}
                >
                  Wearables
                  <CartBadge count={wearCount} />
                </Link>
              </div>
              <Link
                href="/early-access"
                className="inline-flex min-h-11 max-w-44 items-center justify-center truncate rounded-full bg-(--brand-ink) px-3.5 text-xs font-medium text-white shadow-sm shadow-[rgba(44,24,16,0.14)] transition hover:bg-[#3a241a] sm:max-w-none sm:px-5 sm:text-sm md:hidden"
              >
                Register your studio
              </Link>
              <Link
                href="/early-access"
                className="hidden min-h-11 items-center justify-center truncate rounded-full bg-(--brand-ink) px-5 text-sm font-medium text-white shadow-sm shadow-[rgba(44,24,16,0.14)] transition hover:bg-[#3a241a] md:inline-flex"
              >
                Register your studio
              </Link>
              {showPublicSignIn ? (
                <Link href="/login" className={cn(linkClass("/login"), "hidden md:inline-flex")}>
                  Sign in
                </Link>
              ) : null}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          {authed ? (
            <Link
              href="/cart"
              className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-stone-200 text-sm font-medium text-stone-800"
            >
              Cart
            </Link>
          ) : null}
        </div>
      </div>

      {/* Mobile sheet — available for all users */}
      <div
        className={cn(
          "fixed inset-0 z-120 md:hidden transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <button
          type="button"
          className={cn("absolute inset-0 bg-stone-900/40 transition-opacity", open ? "opacity-100" : "opacity-0")}
          aria-label="Close menu"
          onClick={close}
        />
        <div
          className={cn(
            "absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-stone-200 bg-white shadow-xl transition-transform duration-200",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-stone-100 px-4">
            <span className="text-sm font-semibold text-stone-900">Menu</span>
            <button type="button" className={cn(ui.buttonGhost, "min-h-10")} onClick={close}>
              Close
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Mobile primary">
            <label className="mb-2 block rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700">
              <span className="mb-1 block font-medium">Ship to</span>
              <select
                className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm"
                value={region}
                onChange={(e) => void updateRegion(e.target.value)}
                aria-label="Shipping region"
              >
                {SHIPPING_REGION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <Link href="/marketplace" className={mobileLinkClass("/marketplace")}>
              Shop
            </Link>
            <Link href="/classes" className={mobileLinkClass("/classes")}>
              Classes
            </Link>
            <Link href="/category/tableware" className={mobileLinkClass("/category/tableware")}>
              Shop by Category
            </Link>
            <div className="grid grid-cols-2 gap-1 px-1 pb-2">
              {ceramicCategories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className="rounded-lg border border-stone-200 px-2 py-1.5 text-xs text-stone-700"
                >
                  {category.title}
                </Link>
              ))}
            </div>
            <Link href="/wear/shop" className={mobileWearClass}>
              Wearables
              <CartBadge count={wearCount} />
            </Link>
            {authed ? (
              <>
                <Link href="/cart" className={mobileLinkClass("/cart")}>
                  Cart
                </Link>
                <Link href="/dashboard" className={mobileLinkClass("/dashboard")}>
                  Dashboard
                </Link>
                <Link href="/my-bookings" className={mobileLinkClass("/my-bookings")}>
                  My bookings
                </Link>
                <Link href="/account" className={mobileLinkClass("/account")}>
                  Account
                </Link>
                {adminVisible(role) ? (
                  <Link href="/admin" className={mobileLinkClass("/admin")}>
                    Admin
                  </Link>
                ) : null}
                <button
                  type="button"
                  className={cn(ui.buttonGhost, "min-h-12 justify-start px-4 text-base text-stone-600")}
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <hr className="my-2 border-stone-100" />
                <Link href="/early-access" className={mobileLinkClass("/early-access")}>
                  Register your studio
                </Link>
                {showPublicSignIn ? (
                  <Link href="/login" className={mobileLinkClass("/login")}>
                    Sign in
                  </Link>
                ) : null}
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
