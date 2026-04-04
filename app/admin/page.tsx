import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { AdminStudios } from "./admin-studios";
import { AdminBookings } from "./admin-bookings";
import { AdminEarlyAccessList } from "./admin-early-access";
import { AdminOverview } from "./admin-overview";
import { HyperadminSections } from "./hyperadmin-sections";

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
  const last7Start = startOfDay(new Date(now.getTime() - 6 * DAY_MS));
  const last14Start = startOfDay(new Date(now.getTime() - 13 * DAY_MS));
  const staleOrderThreshold = new Date(now.getTime() - DAY_MS);
  const staleCartThreshold = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const [
    pending,
    productCommission,
    bookingCommission,
    featureFlagsActive,
    adminConfigsCount,
    analyticsSnapshotsCount,
    earlyAccessRows,
    earlyAccessCount,
    earlyAccessLast30,
    totalUsers,
    newUsersLast30,
    newUsersToday,
    approvedStudiosCount,
    activeStudiosCount,
    activatedStudiosCount,
    stripeReadyStudiosCount,
    activeProductsCount,
    activeExperiencesCount,
    approvalRequiredExperienceCount,
    waitlistEnabledExperienceCount,
    referralsAcceptedCount,
    referralsCreatedCount,
    reviewStats,
    calendarConnectionsCount,
    calendarErrorsLast30,
    bookingsAwaitingApprovalCount,
    manualRefundQueueCount,
    refundAmountBookings,
    stalePendingOrdersCount,
    staleCartsCount,
    ordersLast60,
    bookingsLast60,
  ] = await Promise.all([
    prisma.studio.findMany({
      where: { status: "pending_review" },
      orderBy: { updatedAt: "asc" },
      include: { owner: { select: { email: true } } },
    }),
    prisma.commissionRule.findFirst({
      where: { ruleScope: "global", studioId: null, itemType: "product", isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.commissionRule.findFirst({
      where: { ruleScope: "global", studioId: null, itemType: "booking", isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.featureFlag.count({ where: { isActive: true } }),
    prisma.adminConfig.count(),
    prisma.analyticsSnapshot.count(),
    prisma.earlyAccessSignup.findMany({
      select: {
        id: true,
        email: true,
        studioName: true,
        country: true,
        websiteOrIg: true,
        photoUrls: true,
        wantBooking: true,
        wantMarket: true,
        wantBoth: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.earlyAccessSignup.count(),
    prisma.earlyAccessSignup.count({ where: { createdAt: { gte: last30Start } } }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: last30Start } } }),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.studio.count({ where: { status: "approved" } }),
    prisma.studio.count({ where: { status: "approved", OR: [{ products: { some: { status: "active" } } }, { experiences: { some: { status: "active" } } }] } }),
    prisma.studio.count({ where: { activationPaidAt: { not: null } } }),
    prisma.stripeAccount.count({ where: { chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true } }),
    prisma.product.count({ where: { status: "active" } }),
    prisma.experience.count({ where: { status: "active" } }),
    prisma.experience.count({ where: { status: "active", bookingApprovalRequired: true } }),
    prisma.experience.count({ where: { status: "active", waitlistEnabled: true } }),
    prisma.referralInvite.count({ where: { acceptedAt: { not: null } } }),
    prisma.referralInvite.count(),
    prisma.review.aggregate({
      where: { isVisible: true },
      _count: { id: true },
      _avg: { rating: true },
    }),
    prisma.calendarConnection.count(),
    prisma.calendarSyncLog.count({ where: { status: "error", createdAt: { gte: last30Start } } }),
    prisma.booking.count({ where: { bookingStatus: "awaiting_vendor_approval" } }),
    prisma.bookingCancellation.count({ where: { refundOutcome: "manual_refund_review_required" } }),
    prisma.bookingCancellation.aggregate({ _sum: { refundAmountCents: true } }),
    prisma.order.count({ where: { orderStatus: "pending", createdAt: { lt: staleOrderThreshold } } }),
    prisma.cart.count({
      where: {
        updatedAt: { lt: staleCartThreshold },
        items: { some: {} },
        lastRecoveryEmailSentAt: null,
      },
    }),
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
  const previousBookings30 = bookingsLast60.filter((booking) => booking.createdAt >= last60Start && booking.createdAt < last30Start);

  const paidOrders30 = currentOrders30.filter(isMonetizedOrder);
  const paidOrdersMonth = ordersLast60.filter((order) => order.createdAt >= monthStart && isMonetizedOrder(order));
  const paidOrdersToday = ordersLast60.filter((order) => order.createdAt >= todayStart && isMonetizedOrder(order));
  const paidOrdersYesterday = ordersLast60.filter(
    (order) => order.createdAt >= yesterdayStart && order.createdAt < todayStart && isMonetizedOrder(order)
  );
  const failedOrders30 = currentOrders30.filter((order) => order.paymentStatus === "failed");
  const refundedOrders30 = currentOrders30.filter(
    (order) => order.orderStatus === "refunded" || order.orderStatus === "partially_refunded" || order.paymentStatus === "refunded" || order.paymentStatus === "partially_refunded"
  );

  const monetizedBookings30 = currentBookings30.filter(isMonetizedBooking);
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
  const platformCommissionPrevious30Cents = sumBy(previousOrders30.filter(isMonetizedOrder), orderCommissionCents);
  const bookingCashMonthCents = sumBy(monetizedBookingsMonth, (booking) => booking.depositAmountCents);
  const refundsProxyCents = sumBy(refundedOrders30, (order) => order.totalCents) + (refundAmountBookings._sum.refundAmountCents ?? 0);
  const manualRefundExposureCents = sumBy(
    currentBookings30.filter(
      (booking) =>
        booking.bookingStatus === "refunded" || booking.bookingStatus === "partially_refunded" || booking.bookingStatus === "cancelled_by_admin"
    ),
    (booking) => booking.depositAmountCents || booking.totalAmountCents
  );
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
  const refundRate = paidOrdersMonth.length > 0 ? refundedOrders30.length / paidOrdersMonth.length : 0;
  const failedPaymentRate =
    currentOrders30.length + currentBookings30.length > 0
      ? (failedOrders30.length + failedBookings30.length) / (currentOrders30.length + currentBookings30.length)
      : 0;
  const cancellationRate =
    currentBookings30.length > 0 ? cancelledBookings30.length / currentBookings30.length : 0;

  const topStudios = buildTopStudios(paidOrdersMonth);
  const topCustomers = buildTopCustomers(ordersLast60.filter(isMonetizedOrder));
  const riskAccounts = buildRiskAccounts(ordersLast60, bookingsLast60);

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

      <HyperadminSections
        financialCards={[
          {
            label: "Gross revenue",
            value: formatCurrency(grossRevenueMonthCents),
            note: `${paidOrdersMonth.length} paid orders this month`,
          },
          {
            label: "Platform take",
            value: formatCurrency(platformCommissionMonthCents),
            note: deltaText(platformCommissionMonthCents, platformCommissionPrevious30Cents, "vs prior 30 days"),
            tone: platformCommissionMonthCents >= platformCommissionPrevious30Cents ? "good" : "warn",
          },
          {
            label: "Refund exposure",
            value: formatCurrency(refundsProxyCents),
            note: `${manualRefundQueueCount} bookings require manual refund review`,
            tone: refundsProxyCents > 0 ? "warn" : "good",
          },
          {
            label: "Average order value",
            value: formatCurrency(paidOrdersMonth.length > 0 ? Math.round(grossRevenueMonthCents / paidOrdersMonth.length) : 0),
            note: "Paid order GMV only",
          },
          {
            label: "Booking cash collected",
            value: formatCurrency(bookingCashMonthCents),
            note: formatCurrency(
              sumBy(monetizedBookingsMonth, (booking) => booking.remainingBalanceCents)
            ) + " still outstanding",
          },
          {
            label: "Gross profit proxy",
            value: formatCurrency(contributionProfitProxyCents),
            note: "Platform take less tracked refund exposure",
          },
          {
            label: "Take rate proxy",
            value: formatPercent(grossRevenueMonthCents > 0 ? platformCommissionMonthCents / grossRevenueMonthCents : 0),
            note: "Based on paid commerce routed through the platform",
          },
          {
            label: "Highest-cost blind spot",
            value: "Infra not tracked",
            note: "Add hosting, storage, email, and AI ledgers next",
            tone: "warn",
          },
        ]}
        userCards={[
          {
            label: "Total users",
            value: formatCompactNumber(totalUsers),
            note: `${newUsersLast30} new in the last 30 days`,
          },
          {
            label: "Active user proxy",
            value: formatCompactNumber(activeUsersProxy),
            note: "Unique commerce participants in 30 days",
          },
          {
            label: "Activated studios",
            value: formatCompactNumber(activatedStudiosCount),
            note: `${formatPercent(activationRate)} of approved studios`,
            tone: activationRate >= 0.6 ? "good" : "warn",
          },
          {
            label: "Stripe-ready studios",
            value: formatCompactNumber(stripeReadyStudiosCount),
            note: `${approvedStudiosCount - stripeReadyStudiosCount} still not payout-ready`,
            tone: stripeReadyStudiosCount >= Math.max(1, Math.floor(approvedStudiosCount * 0.7)) ? "good" : "warn",
          },
          {
            label: "Review sentiment",
            value: reviewStats._avg.rating ? `${reviewStats._avg.rating.toFixed(1)} / 5` : "No ratings",
            note: `${reviewStats._count.id} visible reviews`,
          },
          {
            label: "Top customer value",
            value: topCustomers[0]?.metricA ?? "€0.00",
            note: topCustomers[0]?.name ?? "No monetized customers yet",
          },
          {
            label: "Dormant risk signal",
            value: formatCompactNumber(staleCartsCount),
            note: "Stale carts waiting for recovery email",
            tone: staleCartsCount > 0 ? "warn" : "good",
          },
          {
            label: "Customer support risk",
            value: formatCompactNumber(riskAccounts.length),
            note: "Accounts with refund, failure, or balance risk signals",
          },
        ]}
        planCards={[
          {
            label: "Recurring plans",
            value: "Not yet modeled",
            note: "Billing layer still needs true subscription entities",
            tone: "warn",
          },
          {
            label: "Product commission",
            value: `${((productCommission?.percentageBasisPoints ?? 500) / 100).toFixed(2)}%`,
            note: "Global marketplace take rate",
          },
          {
            label: "Booking commission",
            value: `${((bookingCommission?.percentageBasisPoints ?? productCommission?.percentageBasisPoints ?? 500) / 100).toFixed(2)}%`,
            note: "Global class-booking take rate",
          },
          {
            label: "Approved but inactive",
            value: formatCompactNumber(Math.max(0, approvedStudiosCount - activatedStudiosCount)),
            note: "Immediate activation conversion opportunity",
            tone: approvedStudiosCount > activatedStudiosCount ? "warn" : "good",
          },
          {
            label: "Feature flags live",
            value: formatCompactNumber(featureFlagsActive),
            note: "Current plan/control surface available in DB",
          },
          {
            label: "Admin configs",
            value: formatCompactNumber(adminConfigsCount),
            note: "Platform tuning values with no audit trail yet",
          },
          {
            label: "Pricing simulator",
            value: "Next phase",
            note: "Requires subscription plans and scenario engine",
            tone: "warn",
          },
          {
            label: "Manual plan assignment",
            value: "Not yet built",
            note: "Needs `plan`, `subscription`, and audit models",
            tone: "warn",
          },
        ]}
        growthCards={[
          {
            label: "Early-access pipeline",
            value: formatCompactNumber(earlyAccessCount),
            note: `${earlyAccessLast30} leads in the last 30 days`,
          },
          {
            label: "Referral conversions",
            value: formatCompactNumber(referralsAcceptedCount),
            note: `${referralsCreatedCount} total invites created`,
          },
          {
            label: "Activation conversion",
            value: formatPercent(activationRate),
            note: "Approved studio to paid activation",
          },
          {
            label: "Recovery queue",
            value: formatCompactNumber(staleCartsCount),
            note: "Carts older than 3 hours without recovery email",
            tone: staleCartsCount > 0 ? "warn" : "good",
          },
          {
            label: "New user growth",
            value: formatCompactNumber(newUsersLast30),
            note: `${newUsersToday} arrived today`,
          },
          {
            label: "Waitlist monetization potential",
            value: formatCompactNumber(waitlistEnabledExperienceCount),
            note: `${approvalRequiredExperienceCount} experiences also require manual approval`,
          },
          {
            label: "Channel attribution",
            value: "Missing",
            note: "Add UTM/session attribution for real CAC and funnel intelligence",
            tone: "warn",
          },
          {
            label: "Visitor to signup",
            value: "Not tracked",
            note: "Needs web analytics events and landing-page attribution",
            tone: "warn",
          },
        ]}
        productCards={[
          {
            label: "Active products",
            value: formatCompactNumber(activeProductsCount),
            note: "Marketplace supply currently live",
          },
          {
            label: "Active experiences",
            value: formatCompactNumber(activeExperiencesCount),
            note: "Bookable supply currently live",
          },
          {
            label: "Approval-gated experiences",
            value: formatCompactNumber(approvalRequiredExperienceCount),
            note: "Good for quality control, but adds conversion friction",
          },
          {
            label: "Waitlist-enabled experiences",
            value: formatCompactNumber(waitlistEnabledExperienceCount),
            note: "Good signal for demand capture",
          },
          {
            label: "Analytics snapshots",
            value: formatCompactNumber(analyticsSnapshotsCount),
            note: "Historical metrics store exists but needs stronger contracts",
          },
          {
            label: "Feature usage depth",
            value: "Partial",
            note: "Commerce and catalog signals exist; clickstream does not",
            tone: "warn",
          },
          {
            label: "Feature ROI",
            value: "Not computed",
            note: "Need event tracking plus cost ledger",
            tone: "warn",
          },
          {
            label: "Workflow completion",
            value: "Not tracked",
            note: "Add event-level funnel instrumentation across onboarding and checkout",
            tone: "warn",
          },
        ]}
        opsCards={[
          {
            label: "Stripe-ready studios",
            value: formatCompactNumber(stripeReadyStudiosCount),
            note: `${approvedStudiosCount} approved studios total`,
          },
          {
            label: "Calendar connections",
            value: formatCompactNumber(calendarConnectionsCount),
            note: `${calendarErrorsLast30} sync errors in the last 30 days`,
            tone: calendarErrorsLast30 > 0 ? "warn" : "good",
          },
          {
            label: "Pending booking approvals",
            value: formatCompactNumber(bookingsAwaitingApprovalCount),
            note: "Manual ops load on studios",
            tone: bookingsAwaitingApprovalCount > 0 ? "warn" : "good",
          },
          {
            label: "Stale pending orders",
            value: formatCompactNumber(stalePendingOrdersCount),
            note: "Possible checkout or webhook leakage",
            tone: stalePendingOrdersCount > 0 ? "danger" : "good",
          },
          {
            label: "Monitoring",
            value: process.env.SENTRY_DSN ? "Sentry live" : "Disabled",
            note: process.env.SENTRY_DSN ? "Production capture available" : "Enable DSN for operational observability",
            tone: process.env.SENTRY_DSN ? "good" : "warn",
          },
          {
            label: "Failed payments",
            value: formatCompactNumber(failedOrders30.length + failedBookings30.length),
            note: `${formatPercent(failedPaymentRate)} of recent commerce attempts`,
            tone: failedPaymentRate > 0.05 ? "danger" : "warn",
          },
          {
            label: "Reminder and recovery jobs",
            value: "Cron-based",
            note: "Booking reminders and abandoned carts are active",
          },
          {
            label: "Deployment / incident log",
            value: "Missing",
            note: "Needs persistent job runs, incidents, and retry controls",
            tone: "warn",
          },
        ]}
        riskCards={[
          {
            label: "Manual refund queue",
            value: formatCompactNumber(manualRefundQueueCount),
            note: formatCurrency(manualRefundExposureCents) + " of recent booking refund exposure",
            tone: manualRefundQueueCount > 0 ? "danger" : "good",
          },
          {
            label: "Failed payment rate",
            value: formatPercent(failedPaymentRate),
            note: `${failedOrders30.length + failedBookings30.length} failures in the last 30 days`,
            tone: failedPaymentRate > 0.05 ? "danger" : "warn",
          },
          {
            label: "Refund rate proxy",
            value: formatPercent(refundRate),
            note: "Order refunds against current paid order volume",
            tone: refundRate > 0.04 ? "danger" : "warn",
          },
          {
            label: "Cancellation rate",
            value: formatPercent(cancellationRate),
            note: `${cancelledBookings30.length} cancelled or refunded bookings`,
            tone: cancellationRate > 0.1 ? "danger" : "warn",
          },
          {
            label: "Awaiting approval",
            value: formatCompactNumber(bookingsAwaitingApprovalCount),
            note: "Potential churn risk if response time slips",
            tone: bookingsAwaitingApprovalCount > 0 ? "warn" : "good",
          },
          {
            label: "Commerce backlog",
            value: formatCompactNumber(stalePendingOrdersCount),
            note: "Orders stuck in pending for over 24 hours",
            tone: stalePendingOrdersCount > 0 ? "danger" : "good",
          },
          {
            label: "Payment-provider readiness",
            value: formatPercent(approvedStudiosCount > 0 ? stripeReadyStudiosCount / approvedStudiosCount : 0),
            note: "Approved studios able to charge and receive payouts",
            tone: stripeReadyStudiosCount >= Math.max(1, Math.floor(approvedStudiosCount * 0.7)) ? "good" : "warn",
          },
          {
            label: "Support system maturity",
            value: "Low",
            note: "No first-class tickets, CSAT, or complaint taxonomy yet",
            tone: "warn",
          },
        ]}
        controlCards={[
          {
            label: "Preregistration mode",
            value: process.env.PREREGISTRATION_ONLY === "1" ? "On" : "Off",
            note: "Controls browse gating for public users",
          },
          {
            label: "Feature flags active",
            value: formatCompactNumber(featureFlagsActive),
            note: "Centralized toggles already exist in the database",
          },
          {
            label: "Product commission",
            value: `${((productCommission?.percentageBasisPoints ?? 500) / 100).toFixed(2)}%`,
            note: "Editable via existing commission API",
          },
          {
            label: "Booking commission",
            value: `${((bookingCommission?.percentageBasisPoints ?? productCommission?.percentageBasisPoints ?? 500) / 100).toFixed(2)}%`,
            note: "Editable via existing commission API",
          },
          {
            label: "Audit trail",
            value: "Missing",
            note: "No versioned before/after admin log yet",
            tone: "warn",
          },
          {
            label: "Role separation",
            value: "Shared admin gate",
            note: "`admin` and `hyper_admin` are currently treated the same",
            tone: "warn",
          },
          {
            label: "Notification controls",
            value: "Partial",
            note: "Email alerts exist for early access; ops alerting is still shallow",
            tone: "warn",
          },
          {
            label: "Saved views / exports",
            value: "Next phase",
            note: "Needs parameterized admin APIs and report generation",
            tone: "warn",
          },
        ]}
        forecastCards={[
          {
            label: "Projected 30-day GMV",
            value: formatCurrency(projectLinear(grossRevenueMonthCents, now)),
            note: "Simple pace projection from current month run rate",
          },
          {
            label: "Projected platform take",
            value: formatCurrency(projectLinear(platformCommissionMonthCents, now)),
            note: "Directional only; excludes future pricing changes",
          },
          {
            label: "Projected booking cash",
            value: formatCurrency(projectLinear(bookingCashMonthCents, now)),
            note: "Deposit cash only",
          },
          {
            label: "Projected activations",
            value: formatCompactNumber(
              Math.round((activatedStudiosCount / Math.max(daysIntoMonth(now), 1)) * daysInMonth(now))
            ),
            note: "Current month activation pace extrapolated",
          },
          {
            label: "Renewal forecast",
            value: "Unavailable",
            note: "Requires subscription lifecycle data",
            tone: "warn",
          },
          {
            label: "Upgrade / downgrade forecast",
            value: "Unavailable",
            note: "Requires plans, entitlements, and billing history",
            tone: "warn",
          },
          {
            label: "Cost forecast",
            value: "Unavailable",
            note: "Requires infra, AI, storage, email, and API cost ingestion",
            tone: "warn",
          },
          {
            label: "Profit forecast",
            value: "Proxy only",
            note: "Possible once cost ledger is live",
            tone: "warn",
          },
        ]}
        topStudios={topStudios}
        topCustomers={topCustomers}
        riskAccounts={riskAccounts}
        funnelSteps={[
          {
            label: "Traffic",
            value: "Not tracked",
            note: "Install event analytics to expose landing-page and acquisition performance.",
          },
          {
            label: "Leads",
            value: formatCompactNumber(earlyAccessCount),
            note: `${earlyAccessLast30} added in the last 30 days.`,
          },
          {
            label: "Approved",
            value: formatCompactNumber(approvedStudiosCount),
            note: `${pending.length} still waiting for review.`,
          },
          {
            label: "Activated",
            value: formatCompactNumber(activatedStudiosCount),
            note: `${formatPercent(activationRate)} approval-to-activation conversion.`,
          },
        ]}
        alerts={alerts}
        opportunities={opportunities}
        instrumentationGaps={[
          {
            title: "Session and funnel analytics",
            detail: "Track page views, CTA clicks, onboarding steps, checkout steps, and plan-selection events so the founder can see visitor-to-signup and signup-to-paid conversion clearly.",
          },
          {
            title: "Cost ledger",
            detail: "Ingest hosting, storage, image processing, email, AI, and third-party API costs daily so margin can be calculated by feature, plan, and user segment.",
          },
          {
            title: "Subscription and entitlement model",
            detail: "Add plans, subscriptions, invoices, coupons, feature entitlements, and price-history records to unlock MRR, ARR, churn, renewal, and pricing simulation.",
          },
          {
            title: "Support system",
            detail: "Create support tickets, complaint taxonomy, satisfaction score, and issue linkage to users, features, and orders to surface churn risk early.",
          },
          {
            title: "Audit and control trail",
            detail: "Version all admin changes with actor, before value, after value, and reason so pricing, flags, and policy edits become safely governable.",
          },
          {
            title: "Operational event store",
            detail: "Persist webhook failures, cron runs, queue retries, deployment markers, and system incidents so reliability can be monitored as a first-class dashboard domain.",
          },
        ]}
      />

      <section className="mt-10 rounded-4xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Action queues</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-amber-950">Raw operational workstreams</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">
          These sections stay close to the metal: approvals, leads, and booking records that still need hands-on operator attention.
        </p>
      </section>
      <AdminStudios initialStudios={pending} />
      <AdminEarlyAccessList rows={earlyAccessRows} />
      <AdminBookings />
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

function buildTopCustomers(
  orders: Array<{
    customerEmail: string;
    customerName: string;
    totalCents: number;
  }>
) {
  const map = new Map<string, { name: string; email: string; value: number; orders: number }>();
  for (const order of orders) {
    const key = customerKey(order.customerEmail, order.customerName);
    const current = map.get(key) ?? {
      name: order.customerName,
      email: order.customerEmail,
      value: 0,
      orders: 0,
    };
    current.value += order.totalCents;
    current.orders += 1;
    map.set(key, current);
  }
  return [...map.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((customer) => ({
      name: customer.name,
      secondary: customer.email,
      metricA: formatCurrency(customer.value),
      metricB: `${customer.orders} paid orders`,
      metricC: customer.value >= 50000 ? "High value" : "Growing",
    }));
}

function buildRiskAccounts(
  orders: Array<{
    customerEmail: string;
    customerName: string;
    totalCents: number;
    paymentStatus: string;
    orderStatus: string;
  }>,
  bookings: Array<{
    customerEmail: string;
    customerName: string;
    remainingBalanceCents: number;
    paymentStatus: string;
    bookingStatus: string;
  }>
) {
  const map = new Map<string, { name: string; email: string; value: number; risk: number; note: string }>();

  for (const order of orders) {
    const key = customerKey(order.customerEmail, order.customerName);
    const current = map.get(key) ?? {
      name: order.customerName,
      email: order.customerEmail,
      value: 0,
      risk: 0,
      note: "Stable",
    };
    if (isMonetizedOrder(order)) current.value += order.totalCents;
    if (order.paymentStatus === "failed") {
      current.risk += 2;
      current.note = "Failed payment";
    }
    if (order.orderStatus === "refunded" || order.orderStatus === "partially_refunded") {
      current.risk += 3;
      current.note = "Refund pressure";
    }
    map.set(key, current);
  }

  for (const booking of bookings) {
    const key = customerKey(booking.customerEmail, booking.customerName);
    const current = map.get(key) ?? {
      name: booking.customerName,
      email: booking.customerEmail,
      value: 0,
      risk: 0,
      note: "Stable",
    };
    current.value += booking.remainingBalanceCents;
    if (booking.paymentStatus === "failed") {
      current.risk += 2;
      current.note = "Booking payment failed";
    }
    if (booking.remainingBalanceCents > 0) {
      current.risk += 1;
      current.note = "Outstanding booking balance";
    }
    if (["refunded", "partially_refunded", "cancelled_by_admin"].includes(booking.bookingStatus)) {
      current.risk += 2;
      current.note = "Refund / cancellation friction";
    }
    map.set(key, current);
  }

  return [...map.values()]
    .filter((account) => account.risk > 0 || account.value > 0)
    .sort((a, b) => b.risk - a.risk || b.value - a.value)
    .slice(0, 5)
    .map((account) => ({
      name: account.name,
      secondary: account.email,
      metricA: formatCurrency(account.value),
      metricB: `${account.risk} risk points`,
      metricC: account.note,
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
      detail: `${input.referralsAcceptedCount} referrals have already converted. This is a strong signal to formalize reward economics and make referrals a first-class growth lever.`,
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

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function daysIntoMonth(date: Date) {
  return date.getDate();
}

function projectLinear(currentCents: number, now: Date) {
  const elapsedDays = Math.max(daysIntoMonth(now), 1);
  return Math.round((currentCents / elapsedDays) * daysInMonth(now));
}