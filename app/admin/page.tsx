import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { AdminOverview } from "./admin-overview";
import { cn } from "@/lib/cn";
import { loadWearCatalogValueSnapshot } from "@/lib/wear-spreadconnect-stats";
import { formatWearMoney } from "@/lib/wear-money";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";
import { getHiddenAdminLinks } from "./admin-links";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Home",
  "/admin",
  "Platform overview: revenue, studios, risk, and what needs your attention.",
);

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdminUser();
  if (!user) {
    redirect("/unauthorized-admin");
  }
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = startOfDay(new Date(now.getTime() - DAY_MS));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const last30Start = startOfDay(new Date(now.getTime() - 29 * DAY_MS));
  const last60Start = startOfDay(new Date(now.getTime() - 59 * DAY_MS));
  const staleOrderThreshold = new Date(now.getTime() - DAY_MS);

  const [
    pending,
    earlyAccessCount,
    newUsersLast30,
    newUsersToday,
    approvedStudiosCount,
    activeStudiosCount,
    activatedStudiosCount,
    activeProductsCount,
    activeExperiencesCount,
    approvalRequiredExperienceCount,
    waitlistEnabledExperienceCount,
    referralsAcceptedCount,
    calendarErrorsLast30,
    bookingsAwaitingApprovalCount,
    manualRefundQueueCount,
    refundAmountBookings,
    stalePendingOrdersCount,
    adminUnreadNotifications,
    newFeatureSuggestionsCount,
    ordersLast60,
    bookingsLast60,
  ] = await Promise.all([
    prisma.studio.findMany({
      where: { status: "pending_review" },
      orderBy: { updatedAt: "asc" },
      include: { owner: { select: { email: true } } },
    }),
    prisma.earlyAccessSignup.count(),
    prisma.user.count({ where: { createdAt: { gte: last30Start } } }),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.studio.count({ where: { status: "approved" } }),
    prisma.studio.count({ where: { status: "approved", OR: [{ products: { some: { status: "active" } } }, { experiences: { some: { status: "active" } } }] } }),
    prisma.studio.count({ where: { activationPaidAt: { not: null } } }),
    prisma.product.count({ where: { status: "active" } }),
    prisma.experience.count({ where: { status: "active" } }),
    prisma.experience.count({ where: { status: "active", bookingApprovalRequired: true } }),
    prisma.experience.count({ where: { status: "active", waitlistEnabled: true } }),
    prisma.referralInvite.count({ where: { acceptedAt: { not: null } } }),
    prisma.calendarSyncLog.count({ where: { status: "error", createdAt: { gte: last30Start } } }),
    prisma.booking.count({ where: { bookingStatus: "awaiting_vendor_approval" } }),
    prisma.bookingCancellation.count({ where: { refundOutcome: "manual_refund_review_required" } }),
    prisma.bookingCancellation.aggregate({ _sum: { refundAmountCents: true } }),
    prisma.order.count({ where: { orderStatus: "pending", createdAt: { lt: staleOrderThreshold } } }),
    prisma.adminNotification.count({ where: { readAt: null } }),
    prisma.featureSuggestion.count({ where: { status: "new" } }),
    prisma.order.findMany({
      where: { createdAt: { gte: last60Start } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        customerEmail: true,
        customerName: true,
        orderStatus: true,
        paymentStatus: true,
        totalCents: true,
        subtotalCents: true,
        items: {
          select: {
            itemType: true,
            quantity: true,
            commissionSnapshotCents: true,
            vendorAmountSnapshotCents: true,
            vendor: { select: { id: true, displayName: true, country: true } },
          },
        },
      },
    }),
    prisma.booking.findMany({
      where: { createdAt: { gte: last60Start } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        customerEmail: true,
        customerName: true,
        bookingStatus: true,
        paymentStatus: true,
        totalAmountCents: true,
        depositAmountCents: true,
        remainingBalanceCents: true,
        commissionAmountCents: true,
        vendorAmountCents: true,
        studio: { select: { id: true, displayName: true, country: true } },
        experience: { select: { title: true, bookingApprovalRequired: true, waitlistEnabled: true } },
      },
    }),
  ]);

  const currentOrders30 = ordersLast60.filter((order) => order.createdAt >= last30Start);
  const previousOrders30 = ordersLast60.filter((order) => order.createdAt >= last60Start && order.createdAt < last30Start);
  const currentBookings30 = bookingsLast60.filter((booking) => booking.createdAt >= last30Start);

  const paidOrdersMonth = ordersLast60.filter((order) => order.createdAt >= monthStart && isMonetizedOrder(order));
  const paidOrdersToday = ordersLast60.filter((order) => order.createdAt >= todayStart && isMonetizedOrder(order));
  const paidOrdersYesterday = ordersLast60.filter(
    (order) => order.createdAt >= yesterdayStart && order.createdAt < todayStart && isMonetizedOrder(order)
  );
  const failedOrders30 = currentOrders30.filter((order) => order.paymentStatus === "failed");
  const refundedOrders30 = currentOrders30.filter(
    (order) => order.orderStatus === "refunded" || order.orderStatus === "partially_refunded" || order.paymentStatus === "refunded" || order.paymentStatus === "partially_refunded"
  );

  const monetizedBookingsMonth = bookingsLast60.filter(
    (booking) => booking.createdAt >= monthStart && isMonetizedBooking(booking)
  );
  const failedBookings30 = currentBookings30.filter((booking) => booking.paymentStatus === "failed");
  const cancelledBookings30 = currentBookings30.filter((booking) =>
    ["cancelled_by_customer", "cancelled_by_vendor", "cancelled_by_admin", "refunded", "partially_refunded"].includes(
      booking.bookingStatus
    )
  );

  const grossRevenueTodayCents = sumBy(paidOrdersToday, (order) => order.totalCents);
  const grossRevenueYesterdayCents = sumBy(paidOrdersYesterday, (order) => order.totalCents);
  const grossRevenueMonthCents = sumBy(paidOrdersMonth, (order) => order.totalCents);
  const grossRevenuePrevious30Cents = sumBy(previousOrders30.filter(isMonetizedOrder), (order) => order.totalCents);
  const platformCommissionMonthCents = sumBy(paidOrdersMonth, orderCommissionCents);
  const bookingCashMonthCents = sumBy(
    monetizedBookingsMonth,
    (booking) => booking.totalAmountCents - booking.remainingBalanceCents,
  );
  const refundsProxyCents = sumBy(refundedOrders30, (order) => order.totalCents) + (refundAmountBookings._sum.refundAmountCents ?? 0);
  const contributionProfitProxyCents = Math.max(0, platformCommissionMonthCents - refundsProxyCents);

  const customerActivityKeys = new Set<string>();
  for (const order of currentOrders30) {
    customerActivityKeys.add(customerKey(order.customerEmail, order.customerName));
  }
  for (const booking of currentBookings30) {
    customerActivityKeys.add(customerKey(booking.customerEmail, booking.customerName));
  }
  const activeUsersProxy = customerActivityKeys.size;
  const monetizedCustomerKeys = new Set(
    paidOrdersMonth.map((order) => customerKey(order.customerEmail, order.customerName))
  );
  const arpuMonthCents = monetizedCustomerKeys.size > 0 ? Math.round(grossRevenueMonthCents / monetizedCustomerKeys.size) : 0;
  const ltvProxyCents = arpuMonthCents;

  const activationRate = approvedStudiosCount > 0 ? activatedStudiosCount / approvedStudiosCount : 0;
  const failedPaymentRate =
    currentOrders30.length + currentBookings30.length > 0
      ? (failedOrders30.length + failedBookings30.length) / (currentOrders30.length + currentBookings30.length)
      : 0;
  const cancellationRate =
    currentBookings30.length > 0 ? cancelledBookings30.length / currentBookings30.length : 0;

  const topStudios = buildTopStudios(paidOrdersMonth);

  let wearCatalogValue: Awaited<ReturnType<typeof loadWearCatalogValueSnapshot>> | null = null;
  try {
    wearCatalogValue = await loadWearCatalogValueSnapshot();
  } catch (err) {
    console.error("[admin] wear catalog value snapshot failed", err);
  }

  const founderSummary = [
    `${formatCurrency(grossRevenueMonthCents)} moved through studio sales this month. Platform take: ${formatCurrency(platformCommissionMonthCents)}. Booking cash collected: ${formatCurrency(bookingCashMonthCents)}.`,
    `${activatedStudiosCount} studios live. ${pending.length} waiting for review. ${bookingsAwaitingApprovalCount} bookings waiting on a studio.`,
    refundsProxyCents > 0 || manualRefundQueueCount > 0
      ? `Risk: ${formatCurrency(refundsProxyCents)} in refund exposure and ${manualRefundQueueCount} booking(s) flagged for manual refund.`
      : `No refund pressure right now. Focus on activating approved studios and converting leads.`,
  ].join(" ");

  const alerts = buildAlerts({
    pendingStudios: pending.length,
    manualRefundQueueCount,
    failedPaymentRate,
    stalePendingOrdersCount,
    bookingsAwaitingApprovalCount,
    refundsProxyCents,
    calendarErrorsLast30,
    activationRate,
  });

  const opportunities = buildOpportunities({
    pendingStudios: pending.length,
    earlyAccessCount,
    activatedStudiosCount,
    approvedStudiosCount,
    referralsAcceptedCount,
    waitlistEnabledExperienceCount,
    approvalRequiredExperienceCount,
    activeExperiencesCount,
    activeProductsCount,
    topStudios,
  });

  const revenueTrend = buildTrend(currentOrders30, last30Start, (order) => (isMonetizedOrder(order) ? order.totalCents / 100 : 0));
  const orderTrend = buildTrend(currentOrders30, last30Start, () => 1);
  const bookingTrend = buildTrend(currentBookings30, last30Start, () => 1);

  const apparelOnly = isApparelOnlyLaunch();

  const fullNavCards = [
    { href: "/admin/war-room", title: "War room", desc: "Queues, pulse, and recent events." },
    { href: "/admin/operations", title: "Operations", desc: "Reviews, leads, bookings, recovery." },
    { href: "/admin/studios", title: "Studios", desc: "Approve, inspect, and manage studios." },
    { href: "/admin/users", title: "Users", desc: "Roles, suspension, notes." },
    { href: "/admin/revenue", title: "Revenue", desc: "Sales, take rate, refunds." },
    { href: "/admin/finance", title: "Finance", desc: "Ledger and profitability." },
    { href: "/admin/content", title: "Content", desc: "Products, classes, and studio catalog." },
    { href: "/admin/reports", title: "Reports", desc: "Funnel and retention cuts." },
    { href: "/admin/audit", title: "Audit", desc: "Log of admin changes." },
    { href: "/admin/system", title: "System", desc: "Flags, health, environment." },
    { href: "/admin/settings", title: "Settings", desc: "Commissions and platform config." },
    { href: "/admin/features", title: "Plans & features", desc: "Tiers and feature gating." },
  ] as const;

  const apparelNavCards = [
    { href: "/admin/wear-products", title: "Wear · products", desc: "Catalog, Spreadconnect sync, supply cost." },
    { href: "/admin/wear-orders", title: "Wear · sales", desc: "Apparel orders, fulfillment, refunds." },
    { href: "/admin/wear-analytics", title: "Wear · analytics", desc: "AOV, conversion, SKU mix." },
    { href: "/admin/coupons", title: "Coupons", desc: "% / fixed / 3+1 bundles, scope, limits." },
    { href: "/admin/revenue", title: "Revenue", desc: "Sales, take rate, refunds." },
    { href: "/admin/finance", title: "Finance", desc: "Ledger and profitability." },
    { href: "/admin/users", title: "Users", desc: "Customers, affiliates, admins." },
    { href: "/admin/audit", title: "Audit", desc: "Log of admin changes." },
    { href: "/admin/system", title: "System", desc: "Flags, health, environment." },
    { href: "/admin/settings", title: "Settings", desc: "Commissions, wear markup, affiliate %." },
  ] as const;

  const navCards = apparelOnly ? apparelNavCards : fullNavCards;
  const hiddenLinks = apparelOnly ? getHiddenAdminLinks() : [];

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Hyperadmin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">Platform home</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            Money, risk, and what needs your attention — in one place.
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 shadow-sm">
          <p className="font-medium text-stone-900">Window</p>
          <p className="mt-1 text-stone-600">Last 30 days, with today and risk overlays.</p>
        </div>
      </div>

      {adminUnreadNotifications > 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <Link href="/admin/notifications" className="font-semibold underline-offset-2 hover:underline">
            {adminUnreadNotifications} unread notification{adminUnreadNotifications === 1 ? "" : "s"}
          </Link>
          <span className="text-amber-900/90"> — open the inbox.</span>
        </div>
      ) : null}

      {newFeatureSuggestionsCount > 0 ? (
        <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm text-sky-950">
          <Link href="/admin/feature-suggestions?status=new" className="font-semibold underline-offset-2 hover:underline">
            {newFeatureSuggestionsCount} new feature idea{newFeatureSuggestionsCount === 1 ? "" : "s"}
          </Link>
          <span className="text-sky-900/90"> — people sent in suggestions.</span>
        </div>
      ) : null}

      <AdminOverview
        founderSummary={founderSummary}
        kpis={[
          {
            label: "Revenue today",
            value: formatCurrency(grossRevenueTodayCents),
            delta: deltaText(grossRevenueTodayCents, grossRevenueYesterdayCents, "vs yesterday"),
            tone: grossRevenueTodayCents >= grossRevenueYesterdayCents ? "good" : "warn",
          },
          {
            label: "Revenue this month",
            value: formatCurrency(grossRevenueMonthCents),
            delta: deltaText(grossRevenueMonthCents, grossRevenuePrevious30Cents, "vs prior 30 days"),
            tone: grossRevenueMonthCents >= grossRevenuePrevious30Cents ? "good" : "warn",
          },
          {
            label: "Profit (estimate)",
            value: formatCurrency(contributionProfitProxyCents),
            delta: "Commission minus refunds",
          },
          {
            label: "Active buyers (30d)",
            value: formatCompactNumber(activeUsersProxy),
            delta: "Bought or booked in the last 30 days",
          },
          {
            label: "New users (30d)",
            value: formatCompactNumber(newUsersLast30),
            delta: `${newUsersToday} joined today`,
            tone: newUsersToday > 0 ? "good" : "default",
          },
          {
            label: "Studio activation",
            value: formatPercent(activationRate),
            delta: "Approved studios that went live",
            tone: activationRate >= 0.6 ? "good" : "warn",
          },
          {
            label: "Cancellations (30d)",
            value: formatPercent(cancellationRate),
            delta: `${cancelledBookings30.length} bookings cancelled`,
            tone: cancellationRate > 0.1 ? "danger" : "default",
          },
          {
            label: "Failed payments",
            value: String(failedOrders30.length + failedBookings30.length),
            delta: formatPercent(failedPaymentRate),
            tone: failedPaymentRate > 0.05 ? "danger" : "warn",
          },
          {
            label: "Refund exposure",
            value: formatCurrency(refundsProxyCents),
            delta: "Orders refunded + booking refunds",
            tone: refundsProxyCents > 0 ? "warn" : "good",
          },
          {
            label: "AI / infra cost",
            value: "—",
            delta: "Cost ledger not connected yet",
            tone: "warn",
          },
          {
            label: "Revenue per buyer",
            value: formatCurrency(arpuMonthCents),
            delta: "This month",
          },
          {
            label: "Buyer lifetime value",
            value: formatCurrency(ltvProxyCents),
            delta: "Estimate",
          },
        ]}
        revenueTrend={revenueTrend}
        orderTrend={orderTrend}
        bookingTrend={bookingTrend}
        pendingStudios={pending.length}
        leadCount={earlyAccessCount}
        awaitingApprovalBookings={bookingsAwaitingApprovalCount}
        manualRefundQueue={manualRefundQueueCount}
        activeStudios={activeStudiosCount}
        paidOrdersThisMonth={paidOrdersMonth.length}
        grossRevenueMonthEur={formatCurrencyNumber(grossRevenueMonthCents)}
        platformCommissionMonthEur={formatCurrencyNumber(platformCommissionMonthCents)}
        bookingCashMonthEur={formatCurrencyNumber(bookingCashMonthCents)}
        alerts={alerts}
        opportunities={opportunities}
      />

      {wearCatalogValue ? (
        <section
          aria-label="Spreadconnect catalog value"
          className="mt-10 rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-stone-50 p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                Spreadconnect · catalog value
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-amber-950">
                What the live wear catalog is worth right now.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-stone-600">
                Sum of one unit per saleable variant — print-on-demand has no stock to multiply against.
                Use this to size promotions and check margin at a glance.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${
                  wearCatalogValue.usingInternalPricing
                    ? "border border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border border-stone-300 bg-white text-stone-700"
                }`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    wearCatalogValue.usingInternalPricing ? "bg-emerald-500" : "bg-stone-400"
                  }`}
                />
                {wearCatalogValue.usingInternalPricing ? "Internal pricing" : "DB list prices"}
              </span>
              <Link
                href="/admin/wear-products"
                className="rounded-full border border-amber-900/30 bg-white px-3 py-1 text-amber-900 transition hover:bg-amber-50"
              >
                Wear products →
              </Link>
            </div>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-amber-200 bg-white px-5 py-4 shadow-sm">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Catalog value</dt>
              <dd className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">
                {formatWearMoney(wearCatalogValue.totalCatalogValueCents, wearCatalogValue.currency)}
              </dd>
              <p className="mt-1 text-[11px] text-stone-500">List price × 1 unit per live variant</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Catalog cost</dt>
              <dd className="mt-2 text-3xl font-semibold tracking-tight text-stone-800">
                {formatWearMoney(wearCatalogValue.totalCatalogCostCents, wearCatalogValue.currency)}
              </dd>
              <p className="mt-1 text-[11px] text-stone-500">Spreadconnect supply cost or category floor</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-sm">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Estimated margin
              </dt>
              <dd className="mt-2 text-3xl font-semibold tracking-tight text-emerald-800">
                {formatWearMoney(wearCatalogValue.totalCatalogMarginCents, wearCatalogValue.currency)}
              </dd>
              <p className="mt-1 text-[11px] text-stone-500">Pre-discount, per-unit · cap by current rules</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white px-5 py-4 shadow-sm">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                Linked to Spreadconnect
              </dt>
              <dd className="mt-2 text-3xl font-semibold tracking-tight text-sky-900">
                {wearCatalogValue.spreadconnectLinkedProducts}
                <span className="ml-1 text-base font-medium text-stone-500">
                  / {wearCatalogValue.totalProducts}
                </span>
              </dd>
              <p className="mt-1 text-[11px] text-stone-500">
                {wearCatalogValue.activeProducts} active · {wearCatalogValue.totalVariants} variants
              </p>
            </div>
          </dl>
        </section>
      ) : null}

      <section className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Jump to</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
          {apparelOnly ? "Apparel launch · main sections" : "Main sections"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          {apparelOnly
            ? "Only the surfaces you need to run the apparel-only launch. Studio/marketplace pages still exist — see hidden sections below."
            : "Use the sidebar or pick a section below."}
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {navCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={cn(
                "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-900/25 hover:shadow-md",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900",
              )}
            >
              <p className="font-semibold text-[var(--foreground)]">{card.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.desc}</p>
              <p className="mt-4 text-xs font-medium text-amber-800">Open →</p>
            </Link>
          ))}
        </div>
      </section>

      {hiddenLinks.length > 0 ? (
        <section id="hidden-sections" className="mt-10 scroll-mt-24">
          <details className="group rounded-2xl border border-stone-200 bg-stone-50/60 p-5 open:bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-stone-800 outline-none">
              <span className="flex items-center gap-2">
                <span className="rounded-full border border-stone-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-600">
                  Hidden in apparel-only
                </span>
                <span>
                  {hiddenLinks.length} infra section{hiddenLinks.length === 1 ? "" : "s"} kept available for ops
                </span>
              </span>
              <span aria-hidden className="text-stone-400 transition group-open:rotate-180">
                ▾
              </span>
            </summary>
            <p className="mt-3 text-xs text-stone-500">
              Studio, marketplace, and bookings admin pages still exist on disk. They are reachable here so
              you can fix data, drain queues, or re-enable the studio platform later — no rebuild needed.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {hiddenLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition hover:border-amber-900/25 hover:text-amber-900"
                  >
                    {link.label}
                    <span className="ml-1 font-mono text-[11px] text-stone-400">{link.href}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] text-stone-500">
              To bring everything back, unset <span className="font-mono">NEXT_PUBLIC_LAUNCH_MODE=apparel_only</span> and redeploy.
            </p>
          </details>
        </section>
      ) : null}
    </div>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sumBy<T>(rows: T[], selector: (row: T) => number) {
  return rows.reduce((sum, row) => sum + selector(row), 0);
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatCurrencyNumber(cents: number) {
  return (cents / 100).toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function deltaText(current: number, previous: number, suffix: string) {
  if (previous <= 0) {
    return current > 0 ? `New activity ${suffix}` : `No change ${suffix}`;
  }
  const delta = ((current - previous) / previous) * 100;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}% ${suffix}`;
}

function isMonetizedOrder(order: { orderStatus: string; paymentStatus: string }) {
  return order.paymentStatus === "paid" || ["paid", "processing", "fulfilled", "refunded", "partially_refunded"].includes(order.orderStatus);
}

function isMonetizedBooking(booking: { paymentStatus: string }) {
  return ["paid", "partial", "refunded", "partially_refunded"].includes(booking.paymentStatus);
}

function orderCommissionCents(order: {
  items: Array<{ commissionSnapshotCents: number }>;
}) {
  return sumBy(order.items, (item) => item.commissionSnapshotCents);
}

function customerKey(email: string, name: string) {
  return `${email.toLowerCase()}::${name.trim().toLowerCase()}`;
}

function buildTrend<T extends { createdAt: Date }>(
  rows: T[],
  start: Date,
  valueSelector: (row: T) => number
) {
  const buckets = new Map<string, number>();
  for (let i = 0; i < 30; i += 1) {
    const date = new Date(start.getTime() + i * DAY_MS);
    buckets.set(date.toISOString().slice(5, 10), 0);
  }
  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(5, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + valueSelector(row));
    }
  }
  return [...buckets.entries()].map(([label, value]) => ({ label, value }));
}

function buildTopStudios(
  orders: Array<{
    items: Array<{
      quantity: number;
      commissionSnapshotCents: number;
      vendorAmountSnapshotCents: number;
      vendor: { id: string; displayName: string; country: string };
    }>;
  }>
) {
  const map = new Map<
    string,
    { name: string; country: string; grossCents: number; commissionCents: number; units: number }
  >();
  for (const order of orders) {
    for (const item of order.items) {
      const current = map.get(item.vendor.id) ?? {
        name: item.vendor.displayName,
        country: item.vendor.country,
        grossCents: 0,
        commissionCents: 0,
        units: 0,
      };
      current.grossCents += item.commissionSnapshotCents + item.vendorAmountSnapshotCents;
      current.commissionCents += item.commissionSnapshotCents;
      current.units += item.quantity;
      map.set(item.vendor.id, current);
    }
  }

  return [...map.values()]
    .sort((a, b) => b.grossCents - a.grossCents)
    .slice(0, 5)
    .map((studio) => ({
      name: studio.name,
      secondary: studio.country,
      metricA: formatCurrency(studio.grossCents),
      metricB: formatCurrency(studio.commissionCents),
      metricC: `${studio.units} items`,
    }));
}

function buildAlerts(input: {
  pendingStudios: number;
  manualRefundQueueCount: number;
  failedPaymentRate: number;
  stalePendingOrdersCount: number;
  bookingsAwaitingApprovalCount: number;
  refundsProxyCents: number;
  calendarErrorsLast30: number;
  activationRate: number;
}) {
  const alerts: Array<{ title: string; severity: "critical" | "warning" | "opportunity"; detail: string }> = [];

  if (input.manualRefundQueueCount > 0) {
    alerts.push({
      title: "Manual refunds waiting",
      severity: "critical",
      detail: `${input.manualRefundQueueCount} bookings need manual refund handling. Clear these first.`,
    });
  }
  if (input.failedPaymentRate > 0.05) {
    alerts.push({
      title: "Too many failed payments",
      severity: "critical",
      detail: `${formatPercent(input.failedPaymentRate)} of recent attempts failed. Check checkout, Stripe setup, and studio configuration.`,
    });
  }
  if (input.stalePendingOrdersCount > 0) {
    alerts.push({
      title: "Sales stuck in pending",
      severity: "warning",
      detail: `${input.stalePendingOrdersCount} sales pending for more than 24 hours. Possible webhook or checkout issue.`,
    });
  }
  if (input.bookingsAwaitingApprovalCount > 0) {
    alerts.push({
      title: "Bookings waiting on studios",
      severity: "warning",
      detail: `${input.bookingsAwaitingApprovalCount} bookings need a studio reply. Slow responses hurt trust.`,
    });
  }
  if (input.pendingStudios > 0) {
    alerts.push({
      title: "Studio reviews piling up",
      severity: "warning",
      detail: `${input.pendingStudios} studios waiting for review. Faster reviews = faster live businesses.`,
    });
  }
  if (input.calendarErrorsLast30 > 0) {
    alerts.push({
      title: "Calendar sync errors",
      severity: "warning",
      detail: `${input.calendarErrorsLast30} calendar errors in the last 30 days. Can break booking reliability.`,
    });
  }
  if (input.activationRate < 0.5) {
    alerts.push({
      title: "Activation is low",
      severity: "warning",
      detail: `Only ${formatPercent(input.activationRate)} of approved studios actually went live. Likely onboarding friction.`,
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      title: "No active risks",
      severity: "opportunity",
      detail: "Things look stable. Good time to push activation, referrals, and better metrics.",
    });
  }
  if (input.refundsProxyCents > 0) {
    alerts.push({
      title: "Refund exposure",
      severity: "warning",
      detail: `${formatCurrency(input.refundsProxyCents)} at risk. Track causes before it becomes a pattern.`,
    });
  }

  return alerts.slice(0, 5);
}

function buildOpportunities(input: {
  pendingStudios: number;
  earlyAccessCount: number;
  activatedStudiosCount: number;
  approvedStudiosCount: number;
  referralsAcceptedCount: number;
  waitlistEnabledExperienceCount: number;
  approvalRequiredExperienceCount: number;
  activeExperiencesCount: number;
  activeProductsCount: number;
  topStudios: Array<{ name: string; metricA: string }>;
}) {
  const items: Array<{ title: string; detail: string }> = [];

  if (input.approvedStudiosCount > input.activatedStudiosCount) {
    items.push({
      title: "Help approved studios go live",
      detail: `${input.approvedStudiosCount - input.activatedStudiosCount} approved studios have not activated yet. A focused follow-up gets them selling faster.`,
    });
  }
  if (input.earlyAccessCount > input.approvedStudiosCount) {
    items.push({
      title: "Work the lead backlog",
      detail: `${input.earlyAccessCount} leads in the pipeline. Faster review and follow-up = more live studios without extra spend.`,
    });
  }
  if (input.referralsAcceptedCount > 0) {
    items.push({
      title: "Lean on referrals",
      detail: `${input.referralsAcceptedCount} referral(s) converted. Formalize rewards to keep it compounding.`,
    });
  }
  if (input.waitlistEnabledExperienceCount < input.activeExperiencesCount && input.activeExperiencesCount > 0) {
    items.push({
      title: "Turn on waitlists for more classes",
      detail: `${input.waitlistEnabledExperienceCount} of ${input.activeExperiencesCount} active classes collect waitlist signups. Expand this to capture full-class demand.`,
    });
  }
  if (input.approvalRequiredExperienceCount > 0) {
    items.push({
      title: "Review host-confirm classes",
      detail: `${input.approvalRequiredExperienceCount} classes require manual confirmation. Some could confirm instantly instead.`,
    });
  }
  if (input.topStudios[0]) {
    items.push({
      title: `Copy what ${input.topStudios[0].name} is doing`,
      detail: `${input.topStudios[0].name} leads revenue this month. Study their catalog, pricing, and page structure.`,
    });
  }
  if (input.activeProductsCount > 0 && input.activeExperiencesCount > 0) {
    items.push({
      title: "Bundle classes with products",
      detail: "Studios run both classes and shops. Offer post-class products to boost revenue per customer.",
    });
  }

  return items.slice(0, 5);
}
