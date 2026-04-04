import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { AdminOverview } from "./admin-overview";
import { cn } from "@/lib/cn";

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
  const bookingCashMonthCents = sumBy(monetizedBookingsMonth, (booking) => booking.depositAmountCents);
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

  const founderSummary = [
    `${formatCurrency(grossRevenueMonthCents)} in paid commerce has flowed through the platform this month, with ${formatCurrency(platformCommissionMonthCents)} captured as platform take and ${formatCurrency(bookingCashMonthCents)} collected as booking cash.`,
    `${activatedStudiosCount} studios are activated, ${pending.length} are still waiting for review, and ${bookingsAwaitingApprovalCount} bookings are currently blocked on vendor action.`,
    refundsProxyCents > 0 || manualRefundQueueCount > 0
      ? `The main risk right now is refund and operations pressure: ${formatCurrency(refundsProxyCents)} in refund exposure and ${manualRefundQueueCount} bookings flagged for manual refund review.`
      : `No major refund pressure is visible right now, so the main opportunity is moving approved studios through activation and turning the early-access pipeline into live supply.`,
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

  const navCards = [
    {
      href: "/admin/operations",
      title: "Operations",
      desc: "Approvals, early-access, bookings, recovery queues.",
    },
    { href: "/admin/users", title: "Users", desc: "Roles, suspension, activity, notes." },
    { href: "/admin/revenue", title: "Revenue", desc: "Commerce throughput, take rate, refunds." },
    { href: "/admin/content", title: "Content", desc: "Catalog health: products, experiences, studios." },
    { href: "/admin/reports", title: "Reports", desc: "Funnel, retention proxies, CSV-friendly cuts." },
    { href: "/admin/audit", title: "Audit", desc: "Immutable log of admin mutations." },
    { href: "/admin/system", title: "System", desc: "Feature flags, health signals, environment." },
    { href: "/admin/settings", title: "Settings", desc: "Commissions, platform config, plans surface." },
    { href: "/admin/finance", title: "Finance engine", desc: "Ledger, scenarios, profitability command center." },
  ] as const;

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Founder operating system</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">Hyperadmin control center</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
            Executive visibility, financial control, risk detection, operational queues, and growth intelligence in one place.
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm">
          <p className="font-medium text-amber-950">Current window</p>
          <p className="mt-1 text-stone-600">Last 30 days with live month, today, and risk overlays.</p>
        </div>
      </div>

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
            label: "Net profit proxy",
            value: formatCurrency(contributionProfitProxyCents),
            delta: "Platform take minus tracked refunds",
          },
          {
            label: "Active users",
            value: formatCompactNumber(activeUsersProxy),
            delta: "Commerce-based 30-day activity proxy",
          },
          {
            label: "New users",
            value: formatCompactNumber(newUsersLast30),
            delta: `${newUsersToday} joined today`,
            tone: newUsersToday > 0 ? "good" : "default",
          },
          {
            label: "Conversion rate",
            value: formatPercent(activationRate),
            delta: "Approved studio to activation conversion",
            tone: activationRate >= 0.6 ? "good" : "warn",
          },
          {
            label: "Churn / cancellations",
            value: formatPercent(cancellationRate),
            delta: `${cancelledBookings30.length} booking cancellations in 30 days`,
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
            delta: "Order refund proxy + exact booking refund amounts",
            tone: refundsProxyCents > 0 ? "warn" : "good",
          },
          {
            label: "AI / infra cost",
            value: "Pending",
            delta: "Add cost ledger to unlock unit economics",
            tone: "warn",
          },
          {
            label: "ARPU proxy",
            value: formatCurrency(arpuMonthCents),
            delta: "Per monetized customer this month",
          },
          {
            label: "LTV proxy",
            value: formatCurrency(ltvProxyCents),
            delta: "Observed paid value-to-date proxy",
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

      <section className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Modules</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-amber-950">Drill into the operating system</h2>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Deep panels live on dedicated routes. Use the sidebar or jump from here.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {navCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={cn(
                "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-900/25 hover:shadow-md",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900",
              )}
            >
              <p className="font-semibold text-amber-950">{card.title}</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">{card.desc}</p>
              <p className="mt-4 text-xs font-medium text-amber-800">Open →</p>
            </Link>
          ))}
        </div>
      </section>
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
      title: "Manual refund queue detected",
      severity: "critical",
      detail: `${input.manualRefundQueueCount} bookings require manual refund handling. This risks customer trust and should be cleared before it grows.`,
    });
  }
  if (input.failedPaymentRate > 0.05) {
    alerts.push({
      title: "Failed payment rate is elevated",
      severity: "critical",
      detail: `${formatPercent(input.failedPaymentRate)} of recent commerce attempts failed. Investigate checkout, Stripe account readiness, and vendor-side setup quality.`,
    });
  }
  if (input.stalePendingOrdersCount > 0) {
    alerts.push({
      title: "Pending orders are aging",
      severity: "warning",
      detail: `${input.stalePendingOrdersCount} orders have stayed pending for more than 24 hours, which may signal webhook or checkout leakage.`,
    });
  }
  if (input.bookingsAwaitingApprovalCount > 0) {
    alerts.push({
      title: "Vendor approval backlog",
      severity: "warning",
      detail: `${input.bookingsAwaitingApprovalCount} bookings are awaiting vendor action. Slow approvals can hurt conversion and trust.`,
    });
  }
  if (input.pendingStudios > 0) {
    alerts.push({
      title: "Studio review queue is building",
      severity: "warning",
      detail: `${input.pendingStudios} studios are still waiting for approval. Review velocity is directly linked to supply growth.`,
    });
  }
  if (input.calendarErrorsLast30 > 0) {
    alerts.push({
      title: "Calendar sync issues present",
      severity: "warning",
      detail: `${input.calendarErrorsLast30} calendar sync errors were recorded in the last 30 days. This can create booking reliability risk.`,
    });
  }
  if (input.activationRate < 0.5) {
    alerts.push({
      title: "Activation conversion is weak",
      severity: "warning",
      detail: `Only ${formatPercent(input.activationRate)} of approved studios are activated. The main probable cause is onboarding friction after approval.`,
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      title: "No severe operational risks detected",
      severity: "opportunity",
      detail: "Current signals look stable. This is a good moment to focus on activation speed, referral loops, and analytics instrumentation.",
    });
  }
  if (input.refundsProxyCents > 0) {
    alerts.push({
      title: "Refund exposure is visible",
      severity: "warning",
      detail: `${formatCurrency(input.refundsProxyCents)} is currently sitting in refund exposure proxy. Track root causes before this becomes a recurring drag.`,
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
      title: "Convert approved studios into revenue faster",
      detail: `${input.approvedStudiosCount - input.activatedStudiosCount} approved studios still have not activated. A dedicated activation follow-up flow would likely unlock the fastest revenue lift.`,
    });
  }
  if (input.earlyAccessCount > input.approvedStudiosCount) {
    items.push({
      title: "Mine the early-access backlog",
      detail: `${input.earlyAccessCount} leads are already in the pipeline. Tightening lead scoring, review speed, and outbound follow-up should expand supply without new acquisition spend.`,
    });
  }
  if (input.referralsAcceptedCount > 0) {
    items.push({
      title: "Double down on referrals",
      detail: `${input.referralsAcceptedCount} referral invite(s) have converted. Formalize reward economics to compound growth.`,
    });
  }
  if (input.waitlistEnabledExperienceCount < input.activeExperiencesCount && input.activeExperiencesCount > 0) {
    items.push({
      title: "Expand waitlist capture",
      detail: `${input.waitlistEnabledExperienceCount} of ${input.activeExperiencesCount} active experiences have waitlists enabled. More demand capture would improve conversion recovery and demand visibility.`,
    });
  }
  if (input.approvalRequiredExperienceCount > 0) {
    items.push({
      title: "Audit approval-gated experiences",
      detail: `${input.approvalRequiredExperienceCount} active experiences require vendor approval. Review whether all of them truly need manual approval or if some can shift to instant confirmation.`,
    });
  }
  if (input.topStudios[0]) {
    items.push({
      title: `Study the playbook of ${input.topStudios[0].name}`,
      detail: `${input.topStudios[0].name} is currently leading on revenue contribution. Replicate its catalog, pricing, and merchandising patterns across newer studios.`,
    });
  }
  if (input.activeProductsCount > 0 && input.activeExperiencesCount > 0) {
    items.push({
      title: "Package classes and commerce together",
      detail: "The marketplace and booking surfaces are both active. Create bundles and post-class product offers to increase ARPU without extra acquisition cost.",
    });
  }

  return items.slice(0, 5);
}
