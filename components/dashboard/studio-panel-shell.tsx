"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { getStudioPanelNavGroups, type StudioNavGroup } from "@/lib/studio-panel-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OnboardingShareBanner } from "@/components/dashboard/onboarding-share-banner";
import { platformUi } from "@/lib/ui-styles";

function isNavActive(pathname: string, href: string, studioBase: string): boolean {
  if (href === studioBase) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StudioPanelShell({
  studioId,
  studioName,
  navGroups: navGroupsProp,
  activeBusinessTemplateName,
  children,
}: {
  studioId: string;
  studioName: string;
  navGroups?: StudioNavGroup[];
  activeBusinessTemplateName?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const guidedMode = pathname.includes("/guided");
  const navGroups = navGroupsProp ?? getStudioPanelNavGroups(studioId);
  const studioBase = `/dashboard/${studioId}`;
  const flatNav = useMemo(
    () => navGroups.flatMap((g) => g.items.map((i) => ({ ...i, groupId: g.id }))),
    [navGroups],
  );

  const [mobileOpen, setMobileOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const breadcrumbItems = useMemo(() => {
    const items: { label: string; href?: string }[] = [
      { label: "Home", href: "/" },
      { label: "Dashboard", href: "/dashboard" },
    ];
    if (pathname === studioBase) {
      items.push({ label: studioName });
      return items;
    }
    items.push({ label: studioName, href: studioBase });
    const candidates = flatNav.filter(
      (i) =>
        i.href.length > studioBase.length && (pathname === i.href || pathname.startsWith(`${i.href}/`)),
    );
    const match = candidates.sort((a, b) => b.href.length - a.href.length)[0];
    if (match) {
      items.push({ label: match.label });
      return items;
    }
    const tail = pathname.slice(studioBase.length + 1).split("/").filter(Boolean)[0];
    if (tail) {
      items.push({
        label: tail.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      });
    }
    return items;
  }, [pathname, studioName, flatNav, studioBase]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);

    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", onKey);

      const restoreTarget = previousFocusRef.current;
      if (restoreTarget && document.body.contains(restoreTarget)) {
        restoreTarget.focus();
      }
    };
  }, [mobileOpen]);

  if (guidedMode) {
    return (
      <div className="pm-guided-light-tokens min-h-[calc(100vh-3.5rem)] w-full sm:min-h-[calc(100vh-4rem)]">
        <header className="sticky top-0 z-20 border-b border-stone-200/90 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
            <Link
              href={studioBase}
              className="min-h-11 min-w-11 shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-center text-sm font-medium text-amber-950 shadow-sm"
              aria-label="Back to studio home"
            >
              ←
            </Link>
            <p className="truncate text-center text-sm font-medium text-stone-800">{studioName}</p>
            <span className="w-11 shrink-0" aria-hidden />
          </div>
        </header>
        <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-8">{children}</div>
      </div>
    );
  }

  const renderNav = (onNavigate?: () => void) => (
    <>
      {navGroups.map((group) => (
        <div key={group.id} className="mb-3">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">{group.label}</p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isNavActive(pathname, item.href, studioBase);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-amber-950 text-white" : "text-stone-600 hover:bg-white hover:text-amber-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] w-full max-w-none flex-col sm:min-h-[calc(100vh-4rem)] lg:flex-row">
      <button
        type="button"
        className="flex items-center justify-between border-b border-stone-200/80 bg-white/90 px-4 py-3 text-left text-sm font-medium text-stone-900 backdrop-blur-md lg:hidden"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        aria-controls="studio-panel-mobile-nav"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        <span>Menu · {studioName}</span>
        <span className="text-stone-500" aria-hidden="true">
          {mobileOpen ? "Close" : "Open"}
        </span>
      </button>

      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        id="studio-panel-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label={`${studioName} studio menu`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-stone-950/35 transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-r border-stone-200/80 bg-[#fcfaf7] shadow-xl transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="border-b border-stone-200/80 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Studio</p>
                <p className="mt-1 truncate text-sm font-semibold text-stone-900">{studioName}</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className={`${platformUi.buttonGhost} min-h-10 shrink-0`}
                onClick={() => setMobileOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
          <nav className="overflow-auto p-2" aria-label="Studio panel mobile">
            {renderNav(() => setMobileOpen(false))}
          </nav>
          <div className="mt-auto border-t border-stone-200/80 p-3">
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-white hover:text-amber-950"
            >
              All studios
            </Link>
            <Link
              href={`/studios/${studioId}`}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-white hover:text-amber-950"
            >
              View public page
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                signOut({ callbackUrl: "/login?signedOut=1" });
              }}
              className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-stone-500 hover:bg-white hover:text-amber-950"
            >
              Sign out
            </button>
          </div>
        </aside>
      </div>

      <aside className="hidden w-full shrink-0 flex-col border-stone-200/80 bg-stone-50/80 lg:flex lg:w-56 lg:border-r lg:pt-0">
        <div className="hidden border-b border-stone-200/80 px-4 py-4 lg:block">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Studio</p>
          <p className="mt-1 truncate text-sm font-semibold text-stone-900">{studioName}</p>
        </div>
        <nav className="overflow-auto p-2 lg:p-3" aria-label="Studio panel">
          {renderNav()}
        </nav>
        <div className="mt-auto border-t border-stone-200/80 p-3">
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-white hover:text-amber-950"
          >
            All studios
          </Link>
          <Link
            href={`/studios/${studioId}`}
            className="block rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-white hover:text-amber-950"
          >
            View public page
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login?signedOut=1" })}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-stone-500 hover:bg-white hover:text-amber-950"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:py-8">
        {activeBusinessTemplateName ? (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white/90 px-4 py-3 shadow-(--pm-shadow-rest) sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-stone-700">
              <span className="font-medium text-stone-500">Using:</span>{" "}
              <span className="font-semibold text-stone-900">{activeBusinessTemplateName}</span>
            </p>
            <Link href={`/dashboard/${studioId}/site/page`} className={`${platformUi.buttonSecondary} shrink-0`}>
              Change template
            </Link>
          </div>
        ) : null}
        <Suspense fallback={null}>
          <OnboardingShareBanner studioId={studioId} />
        </Suspense>
        <Breadcrumbs items={breadcrumbItems} className="mb-5" visualMode="platform" />
        {children}
      </main>
    </div>
  );
}
