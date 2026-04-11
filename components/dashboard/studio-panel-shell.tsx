"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Suspense, useMemo, useState } from "react";
import type { StudioPanelNavItem } from "@/lib/studio-panel-nav";
import { studioPanelNav } from "@/lib/studio-panel-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OnboardingShareBanner } from "@/components/dashboard/onboarding-share-banner";
import { platformUi } from "@/lib/ui-styles";

export default function StudioPanelShell({
  studioId,
  studioName,
  navItems,
  activeBusinessTemplateName,
  children,
}: {
  studioId: string;
  studioName: string;
  navItems?: StudioPanelNavItem[];
  /** When set, shows top bar: Using: … + Change template */
  activeBusinessTemplateName?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const guidedMode = pathname.includes("/guided");
  const nav = navItems ?? studioPanelNav(studioId);
  const [mobileOpen, setMobileOpen] = useState(false);

  const breadcrumbItems = useMemo(() => {
    const base = `/dashboard/${studioId}`;
    const items: { label: string; href?: string }[] = [
      { label: "Home", href: "/" },
      { label: "Dashboard", href: "/dashboard" },
    ];
    if (pathname === base) {
      items.push({ label: studioName });
      return items;
    }
    items.push({ label: studioName, href: base });
    const candidates = nav.filter(
      (i) => i.href.length > base.length && (pathname === i.href || pathname.startsWith(`${i.href}/`)),
    );
    const match = candidates.sort((a, b) => b.href.length - a.href.length)[0];
    if (match) {
      items.push({ label: match.label });
      return items;
    }
    const tail = pathname.slice(base.length + 1).split("/")[0];
    if (tail) {
      items.push({
        label: tail.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      });
    }
    return items;
  }, [pathname, studioId, studioName, nav]);

  if (guidedMode) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] w-full bg-[#fcfaf7] text-stone-900 sm:min-h-[calc(100vh-4rem)]">
        <header className="sticky top-0 z-20 border-b border-stone-200/90 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
            <Link
              href={`/dashboard/${studioId}`}
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

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] w-full max-w-none flex-col sm:min-h-[calc(100vh-4rem)] lg:flex-row">
      <button
        type="button"
        className="flex items-center justify-between border-b border-white/10 bg-zinc-900/80 px-4 py-3 text-left text-sm font-medium text-zinc-100 lg:hidden"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        <span>Menu · {studioName}</span>
        <span className="text-zinc-500" aria-hidden="true">{mobileOpen ? "Close" : "Open"}</span>
      </button>

      <aside
        className={`${
          mobileOpen ? "flex" : "hidden"
        } w-full shrink-0 flex-col border-white/10 bg-zinc-900/50 lg:flex lg:w-56 lg:border-r lg:pt-0`}
      >
        <div className="hidden border-b border-white/10 px-4 py-4 lg:block">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Studio</p>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-100">{studioName}</p>
        </div>
        <nav className="flex flex-col gap-0.5 p-2 lg:p-3" aria-label="Studio panel">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-zinc-100 text-zinc-950" : "text-zinc-300 hover:bg-white/5 hover:text-zinc-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 p-3">
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
          >
            All studios
          </Link>
          <Link
            href={`/studios/${studioId}`}
            className="block rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
          >
            View public studio page
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-zinc-950 px-4 py-6 sm:px-6 lg:py-8">
        {activeBusinessTemplateName ? (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-zinc-200">
              <span className="font-medium text-zinc-500">Using:</span>{" "}
              <span className="font-semibold text-zinc-50">{activeBusinessTemplateName}</span>
            </p>
            <Link href={`/dashboard/${studioId}/template`} className={`${platformUi.buttonSecondary} shrink-0`}>
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
