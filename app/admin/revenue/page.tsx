import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { TimeSeriesChart } from "@/components/admin/time-series-chart";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isMonetizedOrder(order: { orderStatus: string; paymentStatus: string }) {
  return (
    order.paymentStatus === "paid" ||
    ["paid", "processing", "fulfilled", "refunded", "partially_refunded"].includes(order.orderStatus)
  );
}

export default async function AdminRevenuePage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const last30Start = startOfDay(new Date(now.getTime() - 29 * DAY_MS));

  const [orders, bookings, redemptions, subscriptions, redemptionRows] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - 59 * DAY_MS) } },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        orderStatus: true,
        paymentStatus: true,
        totalCents: true,
        items: { select: { commissionSnapshotCents: true } },
      },
    }),
    prisma.booking.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - 59 * DAY_MS) } },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        paymentStatus: true,
        depositAmountCents: true,
        bookingStatus: true,
      },
    }),
    prisma.discountRedemption.count({ where: { createdAt: { gte: last30Start } } }),
    prisma.subscription.findMany({
      where: { status: { in: ["active", "trialing", "past_due"] } },
      include: { plan: { select: { priceCents: true, interval: true, currency: true, name: true } } },
    }),
    prisma.discountRedemption.findMany({
      where: { createdAt: { gte: last30Start } },
      include: { coupon: { select: { code: true } } },
      take: 3000,
    }),
  ]);

  const paidMonth = orders.filter((o) => o.createdAt >= monthStart && isMonetizedOrder(o));
  const paid30 = orders.filter((o) => o.createdAt >= last30Start && isMonetizedOrder(o));
  const grossMonth = paidMonth.reduce((s, o) => s + o.totalCents, 0);
  const commissionMonth = paidMonth.reduce(
    (s, o) => s + o.items.reduce((i, it) => i + it.commissionSnapshotCents, 0),
    0
  );
  const refunds30 = orders.filter(
    (o) =>
      o.createdAt >= last30Start &&
      (o.orderStatus === "refunded" ||
        o.orderStatus === "partially_refunded" ||
        o.paymentStatus === "refunded" ||
        o.paymentStatus === "partially_refunded")
  );
  const refundsCents = refunds30.reduce((s, o) => s + o.totalCents, 0);

  const bookingCash30 = bookings
    .filter((b) => b.createdAt >= last30Start && ["paid", "partial"].includes(b.paymentStatus))
    .reduce((s, b) => s + b.depositAmountCents, 0);

  const trend = (() => {
    const buckets = new Map<string, number>();
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(last30Start.getTime() + i * DAY_MS);
      buckets.set(d.toISOString().slice(5, 10), 0);
    }
    for (const o of paid30) {
      const k = o.createdAt.toISOString().slice(5, 10);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + o.totalCents / 100);
    }
    return [...buckets.entries()].map(([label, value]) => ({ label, value }));
  })();

  const eur = (c: number) =>
    new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(c / 100);

  let mrrCents = 0;
  let arrCents = 0;
  for (const s of subscriptions) {
    const p = s.plan.priceCents;
    if (s.plan.interval === "month") {
      mrrCents += p;
      arrCents += p * 12;
    } else {
      mrrCents += Math.round(p / 12);
      arrCents += p;
    }
  }

  const couponMap = new Map<string, { code: string; uses: number; discountCents: number }>();
  for (const r of redemptionRows) {
    const key = r.couponId;
    const row = couponMap.get(key) ?? { code: r.coupon.code, uses: 0, discountCents: 0 };
    row.uses += 1;
    row.discountCents += r.amountCents;
    couponMap.set(key, row);
  }
  const topCoupons = [...couponMap.values()].sort((a, b) => b.discountCents - a.discountCents).slice(0, 10);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Revenue</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Financial throughput</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Paid order GMV, platform commission snapshots, subscriptions (MRR proxy), coupons, refunds, and booking deposit
        cash.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="GMV (paid orders, MTD)" value={eur(grossMonth)} hint={`${paidMonth.length} orders`} />
        <StatCard label="Platform take (MTD)" value={eur(commissionMonth)} hint="Sum of commission snapshots" />
        <StatCard label="MRR (subscription proxy)" value={eur(mrrCents)} hint={`${subscriptions.length} billable subs`} />
        <StatCard label="ARR (directional)" value={eur(arrCents)} hint="Monthlies ×12 + annuals" />
        <StatCard label="Refund proxy (30d)" value={eur(refundsCents)} hint={`${refunds30.length} order rows`} />
        <StatCard label="Booking deposits (30d)" value={eur(bookingCash30)} hint="Cash collected on bookings" />
        <StatCard label="Coupon redemptions (30d)" value={String(redemptions)} hint="All discount redemptions" />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-amber-950">Coupon performance (30d)</h2>
        <p className="mt-1 text-xs text-stone-500">
          Discount value attributed to redemptions (top {topCoupons.length} codes by value; sample capped at 3k rows).
        </p>
        <div className="mt-4">
          <DataTable
            rows={topCoupons}
            empty="No redemptions in the last 30 days."
            columns={[
              { key: "c", header: "Code", cell: (r) => <code className="text-xs">{r.code}</code> },
              { key: "u", header: "Uses", cell: (r) => String(r.uses) },
              { key: "d", header: "Discount given", cell: (r) => eur(r.discountCents) },
            ]}
          />
        </div>
      </section>

      <div className="mt-10">
        <TimeSeriesChart title="Paid GMV / day (30d)" subtitle="EUR, marketplace orders" points={trend} prefix="€" />
      </div>

      <p className="mt-8 text-sm">
        <Link href="/admin/finance" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Finance engine · ledger & scenarios →
        </Link>
      </p>
    </div>
  );
}
