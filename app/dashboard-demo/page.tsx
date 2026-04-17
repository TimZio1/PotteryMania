import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MarketingLayout } from "@/components/marketing-layout";
import { buildMetadata } from "@/lib/seo";
import { platformUi } from "@/lib/ui-styles";

export const metadata: Metadata = buildMetadata({
  title: "Dashboard demo | PotteryMania",
  description:
    "Preview the studio control panel before you create your account: bookings, shop, templates, payments, and public page tools.",
  path: "/dashboard-demo",
});

const demoNav = [
  {
    section: "Overview",
    items: [
      { label: "Home", href: "#demo-today" },
      { label: "Guided setup", href: "#demo-actions" },
      { label: "Reports", href: "#demo-metrics" },
    ],
  },
  {
    section: "Schedule & programs",
    items: [
      { label: "Sessions", href: "#demo-sessions" },
      { label: "Programs", href: "#demo-sessions" },
      { label: "Instructors", href: "#demo-actions" },
      { label: "Guests", href: "#demo-metrics" },
    ],
  },
  {
    section: "Commerce",
    items: [
      { label: "Catalog", href: "#demo-templates" },
      { label: "Gift cards", href: "#demo-templates" },
      { label: "Money", href: "#demo-actions" },
      { label: "Integrations", href: "#demo-actions" },
    ],
  },
  {
    section: "Site",
    items: [
      { label: "Public page", href: "#demo-appearance" },
      { label: "View public page", href: "/demo" },
      { label: "Reviews", href: "#demo-sessions" },
    ],
  },
  {
    section: "Settings",
    items: [{ label: "Settings", href: "#demo-actions" }],
  },
] as const;

const templateCards = [
  {
    name: "Classes first",
    label: "Workshops and weekly sessions",
    bullets: ["Lead with bookings", "Keep class schedule visible", "Push repeat student retention"],
    price: "EUR 19 / month",
  },
  {
    name: "Hybrid studio",
    label: "Products and sessions together",
    bullets: ["Sell work and take reservations", "Keep one studio identity", "Balance product and class revenue"],
    price: "EUR 29 / month",
  },
  {
    name: "Shop focused",
    label: "Collections and direct sales",
    bullets: ["Push featured product drops", "Simplify checkout flow", "Highlight inventory and gift cards"],
    price: "EUR 19 / month",
  },
] as const;

const upcomingSessions = [
  "Wed 18:30 · Beginner wheel throwing · 8 booked",
  "Sat 11:00 · Glaze lab workshop · 5 booked",
  "Sun 14:00 · Open studio session · 12 booked",
] as const;

export default function DashboardDemoPage() {
  return (
    <MarketingLayout
      toolbar={
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Demo studio", href: "/demo" },
            { label: "Dashboard demo" },
          ]}
          visualMode="platform"
        />
      }
    >
      <main className="pm-visual-platform bg-[#fcfaf7] text-stone-900">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-2xl border border-amber-200/90 bg-linear-to-br from-amber-50 to-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">Studio owner demo</p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-2xl font-semibold tracking-tight text-amber-950 sm:text-3xl">
                  This is what a studio sees after signing in
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-stone-700 sm:text-base">
                  Preview the control panel for classes, shop, payments, public page design, templates, and integrations.
                  It is a guided studio workspace, not a generic admin.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/demo" className={platformUi.buttonSecondary}>
                  Open public page demo
                </Link>
                <Link href="/register" className={platformUi.buttonPrimary}>
                  Create your studio
                </Link>
              </div>
            </div>
          </div>

          <div className="flex min-h-[calc(100vh-16rem)] flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_24px_60px_rgba(28,25,23,0.08)] lg:flex-row">
            <div className="border-b border-stone-200 bg-stone-50/90 lg:hidden">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-left">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Studio</p>
                    <p className="mt-1 truncate text-sm font-semibold text-stone-900">Menu · Clay &amp; Fire Studio</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-stone-500 group-open:hidden">Open</span>
                  <span className="shrink-0 text-sm font-medium text-stone-500 hidden group-open:inline">Close</span>
                </summary>
                <nav className="border-t border-stone-200 px-3 py-3" aria-label="Studio demo mobile navigation">
                  {demoNav.map((group) => (
                    <div key={group.section} className="mb-3 last:mb-0">
                      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                        {group.section}
                      </p>
                      <div className="flex flex-col gap-1">
                        {group.items.map((item, index) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            className={`rounded-lg px-3 py-3 text-sm font-medium ${
                              group.section === "Overview" && index === 0
                                ? "bg-amber-950 text-white"
                                : "text-stone-700 hover:bg-white"
                            }`}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </details>
            </div>

            <aside className="hidden border-b border-stone-200 bg-stone-50/90 lg:block lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
              <div className="border-b border-stone-200 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Studio</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">Clay &amp; Fire Studio</p>
                <p className="mt-1 text-xs text-stone-500">Dashboard demo</p>
              </div>
              <nav className="grid gap-3 p-3" aria-label="Studio demo navigation">
                {demoNav.map((group) => (
                  <div key={group.section}>
                    <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                      {group.section}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {group.items.map((item, index) => (
                        <Link
                          href={item.href}
                          key={item.label}
                          className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                            group.section === "Overview" && index === 0
                              ? "bg-amber-950 text-white"
                              : "text-stone-600 hover:bg-white"
                          }`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </aside>

            <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
              <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 lg:hidden">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Studio</p>
                <p className="mt-1 truncate text-base font-semibold text-stone-900">Clay &amp; Fire Studio</p>
              </div>

              <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white/90 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-sm text-stone-700">
                  <span className="font-medium text-stone-500">Using:</span>{" "}
                  <span className="font-semibold text-stone-900">Hybrid studio</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className={`${platformUi.buttonSecondary} pointer-events-none`}>Change template</span>
                  <span className={`${platformUi.buttonSecondary} pointer-events-none`}>Open public page</span>
                </div>
              </div>

              <div id="demo-today">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Today&apos;s sessions</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-amber-950 sm:text-3xl">
                  Clay &amp; Fire Studio
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-stone-600">
                  Review bookings, direct revenue, public page design, and the next actions that keep your studio moving.
                </p>
              </div>

              <div id="demo-metrics" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className={platformUi.card}>
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Direct revenue (30d est.)</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-950">EUR 2,480</p>
                  <p className="mt-2 text-xs text-stone-500">Paid bookings and product sales combined.</p>
                </div>
                <div className={platformUi.card}>
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Active contacts (90d)</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-950">86</p>
                  <p className="mt-2 text-xs text-stone-500">Distinct customers and students who booked recently.</p>
                </div>
                <div className={platformUi.card}>
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Session fill (7d)</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-950">74%</p>
                  <p className="mt-2 text-xs text-stone-500">Average reserved vs capacity on open sessions.</p>
                </div>
                <div className={platformUi.card}>
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Upcoming sessions (7d)</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-950">11</p>
                  <p className="mt-2 text-xs text-stone-500">Approved or confirmed reservations in the next week.</p>
                </div>
              </div>

              <div id="demo-actions" className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className={platformUi.card}>
                  <h3 className="text-lg font-semibold text-amber-950">Quick actions</h3>
                  <p className="mt-2 text-sm text-stone-600">
                    The panel keeps day-to-day work obvious so studios do not get lost in setup.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <span className={`${platformUi.buttonPrimary} pointer-events-none`}>Open session calendar</span>
                    <span className={`${platformUi.buttonSecondary} pointer-events-none`}>Continue guided setup</span>
                    <span className={`${platformUi.buttonSecondary} pointer-events-none`}>View public page</span>
                  </div>
                </div>
                <div id="demo-appearance" className={platformUi.card}>
                  <h3 className="text-lg font-semibold text-amber-950">Public page and appearance</h3>
                  <p className="mt-2 text-sm text-stone-600">
                    Templates shape the studio workflow. Appearance controls shape the public look and feel.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Template</p>
                      <p className="mt-2 text-sm font-semibold text-stone-900">Hybrid studio</p>
                      <p className="mt-1 text-sm text-stone-600">Products and bookings under one brand.</p>
                    </div>
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Appearance</p>
                      <p className="mt-2 text-sm font-semibold text-stone-900">Warm minimal</p>
                      <p className="mt-1 text-sm text-stone-600">Serif editorial, rounded media, pill buttons.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div id="demo-templates" className={platformUi.card}>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Public page templates</p>
                      <h3 className="mt-1 text-lg font-semibold text-amber-950">Choose how your studio grows</h3>
                    </div>
                    <Link href="/dashboard/studio/new" className={platformUi.buttonSecondary}>
                      Start setup
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    {templateCards.map((template, index) => (
                      <article key={template.name} className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5">
                        <div className="flex flex-wrap gap-2">
                          {index === 0 ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-950">
                              Recommended
                            </span>
                          ) : null}
                          {index === 1 ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-950">
                              Active in demo
                            </span>
                          ) : null}
                        </div>
                        <h4 className="mt-3 text-base font-semibold text-stone-900">{template.name}</h4>
                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-500">{template.label}</p>
                        <ul className="mt-4 space-y-2 text-sm text-stone-600">
                          {template.bullets.map((bullet) => (
                            <li key={bullet} className="flex gap-2">
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-700" aria-hidden />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-5 text-sm font-semibold text-amber-950">{template.price}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div id="demo-sessions" className={platformUi.card}>
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Upcoming sessions</p>
                  <div className="mt-4 space-y-3">
                    {upcomingSessions.map((session) => (
                      <div key={session} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                        {session}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-950">What this demo proves</p>
                    <p className="mt-2 text-sm text-amber-900">
                      The product already has a real studio-owner structure for operations, commerce, marketing, and
                      settings. This demo simply exposes that experience before signup.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}
