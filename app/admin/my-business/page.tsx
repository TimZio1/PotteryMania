import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { cn } from "@/lib/cn";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "My business",
  "/admin/my-business",
  "Simple owner snapshot: profits, expenses, studios, and t-shirt sales.",
);

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function prevMonthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

function eur(cents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function pct(current: number, previous: number): string | null {
  if (previous <= 0) return current > 0 ? "New" : null;
  const delta = ((current - previous) / previous) * 100;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(0)}%`;
}

export default async function MyBusinessPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const now = new Date();
  const month = monthStart(now);
  const prevMonth = prevMonthStart(now);
  const last30 = startOfDay(new Date(now.getTime() - 29 * DAY_MS));

  const [
    paidOrdersThisMonth,
    paidOrdersPrevMonth,
    monetizedBookingsThisMonth,
    monetizedBookingsPrevMonth,
    refundedOrdersThisMonth,
    refundBookingAmountThisMonth,
    totalStudios,
    newStudiosThisMonth,
    activeStudios,
    wearOrdersThisMonth,
    wearOrdersPrevMonth,
    wearTopProducts,
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: month },
        OR: [
          { paymentStatus: "paid" },
          { orderStatus: { in: ["paid", "processing", "fulfilled"] } },
        ],
      },
      select: {
        totalCents: true,
        items: { select: { commissionSnapshotCents: true } },
      },
    }),

    prisma.order.findMany({
      where: {
        createdAt: { gte: prevMonth, lt: month },
        OR: [
          { paymentStatus: "paid" },
          { orderStatus: { in: ["paid", "processing", "fulfilled"] } },
        ],
      },
      select: {
        totalCents: true,
        items: { select: { commissionSnapshotCents: true } },
      },
    }),

    prisma.booking.findMany({
      where: {
        createdAt: { gte: month },
        paymentStatus: { in: ["paid", "partial"] },
      },
      select: {
        commissionAmountCents: true,
        totalAmountCents: true,
        remainingBalanceCents: true,
      },
    }),

    prisma.booking.findMany({
      where: {
        createdAt: { gte: prevMonth, lt: month },
        paymentStatus: { in: ["paid", "partial"] },
      },
      select: { commissionAmountCents: true },
    }),

    prisma.order.aggregate({
      where: {
        createdAt: { gte: month },
        orderStatus: { in: ["refunded", "partially_refunded"] },
      },
      _sum: { totalCents: true },
    }),

    prisma.bookingCancellation.aggregate({
      where: { createdAt: { gte: month } },
      _sum: { refundAmountCents: true },
    }),

    prisma.studio.count(),
    prisma.studio.count({ where: { createdAt: { gte: month } } }),
    prisma.studio.count({
      where: {
        status: "approved",
        OR: [
          { products: { some: { status: "active" } } },
          { experiences: { some: { status: "active" } } },
        ],
      },
    }),

    prisma.wearOrder.findMany({
      where: {
        status: { in: ["paid", "in_production", "fulfilled", "shipped"] },
        paidAt: { gte: month },
      },
      select: {
        amountTotalCents: true,
        subtotalCents: true,
        items: {
          select: { quantity: true, unitPriceCents: true },
        },
      },
    }),

    prisma.wearOrder.findMany({
      where: {
        status: { in: ["paid", "in_production", "fulfilled", "shipped"] },
        paidAt: { gte: prevMonth, lt: month },
      },
      select: {
        amountTotalCents: true,
        subtotalCents: true,
        items: {
          select: { quantity: true, unitPriceCents: true },
        },
      },
    }),

    prisma.wearOrderItem.groupBy({
      by: ["wearProductId"],
      where: {
        order: {
          status: { in: ["paid", "in_production", "fulfilled", "shipped"] },
          paidAt: { gte: last30 },
        },
      },
      _sum: { quantity: true, unitPriceCents: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const topProductIds = wearTopProducts.map((p) => p.wearProductId);
  const topProductNames =
    topProductIds.length > 0
      ? await prisma.wearProduct.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, name: true },
        })
      : [];
  const nameMap = new Map(topProductNames.map((p) => [p.id, p.name]));

  const orderCommission = paidOrdersThisMonth.reduce(
    (sum, o) =>
      sum + o.items.reduce((s, i) => s + i.commissionSnapshotCents, 0),
    0,
  );
  const prevOrderCommission = paidOrdersPrevMonth.reduce(
    (sum, o) =>
      sum + o.items.reduce((s, i) => s + i.commissionSnapshotCents, 0),
    0,
  );
  const bookingCommission = monetizedBookingsThisMonth.reduce(
    (sum, b) => sum + b.commissionAmountCents,
    0,
  );
  const prevBookingCommission = monetizedBookingsPrevMonth.reduce(
    (sum, b) => sum + b.commissionAmountCents,
    0,
  );

  const wearRevenue = wearOrdersThisMonth.reduce(
    (sum, o) => sum + (o.amountTotalCents ?? o.subtotalCents),
    0,
  );
  const prevWearRevenue = wearOrdersPrevMonth.reduce(
    (sum, o) => sum + (o.amountTotalCents ?? o.subtotalCents),
    0,
  );
  const wearUnits = wearOrdersThisMonth.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0,
  );

  const totalProfitThis = orderCommission + bookingCommission + wearRevenue;
  const totalProfitPrev = prevOrderCommission + prevBookingCommission + prevWearRevenue;

  const refundsThis =
    (refundedOrdersThisMonth._sum.totalCents ?? 0) +
    (refundBookingAmountThisMonth._sum.refundAmountCents ?? 0);

  const netProfit = totalProfitThis - refundsThis;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Owner view
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">
        My business
      </h1>
      <p className="mt-3 text-sm text-stone-600">
        {new Date().toLocaleDateString("en-IE", {
          month: "long",
          year: "numeric",
        })}
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {/* --- PROFITS --- */}
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            My profits
          </p>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-amber-950">
            {eur(netProfit)}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Net this month (after refunds)
          </p>

          <dl className="mt-6 space-y-4">
            <Row
              label="Studio commissions"
              value={eur(orderCommission + bookingCommission)}
              delta={pct(
                orderCommission + bookingCommission,
                prevOrderCommission + prevBookingCommission,
              )}
            />
            <Row
              label="T-shirt revenue"
              value={eur(wearRevenue)}
              delta={pct(wearRevenue, prevWearRevenue)}
            />
            <Row
              label="Refunds given back"
              value={refundsThis > 0 ? `- ${eur(refundsThis)}` : eur(0)}
              negative={refundsThis > 0}
            />
          </dl>

          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
            <p className="text-sm font-medium text-emerald-900">
              {pct(totalProfitThis, totalProfitPrev)
                ? `${pct(totalProfitThis, totalProfitPrev)} vs last month`
                : "No data from last month yet"}
            </p>
          </div>
        </section>

        {/* --- EXPENSES --- */}
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
            My expenses
          </p>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-amber-950">
            {eur(refundsThis)}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Total outflows this month
          </p>

          <dl className="mt-6 space-y-4">
            <Row label="Refunds (orders)" value={eur(refundedOrdersThisMonth._sum.totalCents ?? 0)} />
            <Row
              label="Refunds (bookings)"
              value={eur(refundBookingAmountThisMonth._sum.refundAmountCents ?? 0)}
            />
          </dl>

          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-sm text-stone-600">
              Stripe fees and hosting costs are not tracked here yet. Add ledger
              entries to see the full picture.
            </p>
          </div>
        </section>

        {/* --- STUDIOS --- */}
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Studios
          </p>
          <div className="mt-4 flex items-baseline gap-4">
            <p className="text-4xl font-semibold tracking-tight text-amber-950">
              {totalStudios}
            </p>
            <p className="text-sm text-stone-500">total</p>
          </div>

          <dl className="mt-6 space-y-4">
            <Row label="Active (selling or booking)" value={String(activeStudios)} />
            <Row
              label="Joined this month"
              value={`+${newStudiosThisMonth}`}
              positive={newStudiosThisMonth > 0}
            />
          </dl>
        </section>

        {/* --- T-SHIRT SALES --- */}
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
            T-shirt sales
          </p>
          <div className="mt-4 flex items-baseline gap-4">
            <p className="text-4xl font-semibold tracking-tight text-amber-950">
              {eur(wearRevenue)}
            </p>
            <p className="text-sm text-stone-500">this month</p>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            {wearUnits} unit{wearUnits !== 1 ? "s" : ""} sold &middot;{" "}
            {wearOrdersThisMonth.length} order
            {wearOrdersThisMonth.length !== 1 ? "s" : ""}
          </p>

          {wearTopProducts.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Top sellers (30 days)
              </p>
              <ol className="mt-3 space-y-2">
                {wearTopProducts.map((item, i) => (
                  <li
                    key={item.wearProductId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 bg-stone-50/60 px-4 py-2.5"
                  >
                    <span className="truncate text-sm font-medium text-amber-950">
                      {i + 1}. {nameMap.get(item.wearProductId) ?? "Unknown"}
                    </span>
                    <span className="whitespace-nowrap text-sm text-stone-500">
                      {item._sum.quantity ?? 0} sold
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {wearTopProducts.length === 0 && (
            <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm text-stone-500">No t-shirt sales in the last 30 days.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  delta,
  negative,
  positive,
}: {
  label: string;
  value: string;
  delta?: string | null;
  negative?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-200/70 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="flex items-center gap-2">
        <span
          className={cn(
            "text-lg font-semibold tracking-tight",
            negative ? "text-red-700" : positive ? "text-emerald-700" : "text-amber-950",
          )}
        >
          {value}
        </span>
        {delta && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
            {delta}
          </span>
        )}
      </dd>
    </div>
  );
}
