import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { studioThroughputLast30d } from "@/lib/admin-revenue-per-studio";
import {
  aggregatePlanSubscriptionRows,
  featureAddonMrrRows,
} from "@/lib/admin-revenue-streams";
import { requireAdminUser } from "@/lib/auth-session";
import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { TimeSeriesChart } from "@/components/admin/time-series-chart";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";

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

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function matchesStudioQ(
  row: { displayName: string; city: string | null; country: string | null },
  q: string,
) {
  const n = row.displayName.toLowerCase();
  const city = (row.city ?? "").toLowerCase();
  const country = (row.country ?? "").toLowerCase();
  return n.includes(q) || city.includes(q) || country.includes(q);
}

function revenueHref(tab: "overview" | "breakdown", q: string, windowDays: number) {
  const p = new URLSearchParams();
  if (tab === "breakdown") p.set("tab", "breakdown");
  if (windowDays === 90) p.set("days", "90");
  if (q.trim()) p.set("q", q.trim());
  const s = p.toString();
  return s ? `/admin/revenue?${s}` : "/admin/revenue";
}

function parseRevenueWindowDays(sp: Record<string, string | string[] | undefined>): number {
  const raw = typeof sp.days === "string" ? sp.days.trim() : "";
  return raw === "90" ? 90 : 30;
}

export default async function AdminRevenuePage({ searchParams }: Props) {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const sp = (await searchParams) ?? {};
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const qLower = qRaw.toLowerCase();
  const tab = typeof sp.tab === "string" && sp.tab === "breakdown" ? "breakdown" : "overview";
  const windowDays = parseRevenueWindowDays(sp);
  const windowLabel = `${windowDays}d`;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const windowStart = startOfDay(new Date(now.getTime() - (windowDays - 1) * DAY_MS));
  const dataLookbackDays = windowDays + 60;

  const [orders, bookings, redemptions, subscriptions, redemptionRows, studioThroughput, featureAddonRows] =
    await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - dataLookbackDays * DAY_MS) } },
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
      where: { createdAt: { gte: new Date(now.getTime() - dataLookbackDays * DAY_MS) } },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        paymentStatus: true,
        depositAmountCents: true,
        bookingStatus: true,
      },
    }),
    prisma.discountRedemption.count({ where: { createdAt: { gte: windowStart } } }),
    prisma.subscription.findMany({
      where: { status: { in: ["active", "trialing", "past_due"] } },
      include: { plan: { select: { priceCents: true, interval: true, currency: true, name: true } } },
    }),
    prisma.discountRedemption.findMany({
      where: { createdAt: { gte: windowStart } },
      include: { coupon: { select: { code: true } } },
      take: 3000,
    }),
    studioThroughputLast30d(prisma, windowStart),
    tab === "breakdown" ? featureAddonMrrRows(prisma) : Promise.resolve([]),
  ]);

  const studioThroughputFiltered =
    qLower.length > 0 ? studioThroughput.filter((r) => matchesStudioQ(r, qLower)) : studioThroughput;

  const paidMonth = orders.filter((o) => o.createdAt >= monthStart && isMonetizedOrder(o));
  const paidWindow = orders.filter((o) => o.createdAt >= windowStart && isMonetizedOrder(o));
  const commissionWindowCents = paidWindow.reduce(
    (s, o) => s + o.items.reduce((i, it) => i + it.commissionSnapshotCents, 0),
    0,
  );
  const grossMonth = paidMonth.reduce((s, o) => s + o.totalCents, 0);
  const commissionMonth = paidMonth.reduce(
    (s, o) => s + o.items.reduce((i, it) => i + it.commissionSnapshotCents, 0),
    0
  );
  const refundsWindow = orders.filter(
    (o) =>
      o.createdAt >= windowStart &&
      (o.orderStatus === "refunded" ||
        o.orderStatus === "partially_refunded" ||
        o.paymentStatus === "refunded" ||
        o.paymentStatus === "partially_refunded")
  );
  const refundsCents = refundsWindow.reduce((s, o) => s + o.totalCents, 0);

  const bookingCashWindow = bookings
    .filter((b) => b.createdAt >= windowStart && ["paid", "partial"].includes(b.paymentStatus))
    .reduce((s, b) => s + b.depositAmountCents, 0);

  const trend = (() => {
    const buckets = new Map<string, number>();
    for (let i = 0; i < windowDays; i += 1) {
      const d = new Date(windowStart.getTime() + i * DAY_MS);
      buckets.set(d.toISOString().slice(5, 10), 0);
    }
    for (const o of paidWindow) {
      const k = o.createdAt.toISOString().slice(5, 10);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + o.totalCents / 100);
    }
    return [...buckets.entries()].map(([label, value]) => ({ label, value }));
  })();

  const commissionTrend = (() => {
    const buckets = new Map<string, number>();
    for (let i = 0; i < windowDays; i += 1) {
      const d = new Date(windowStart.getTime() + i * DAY_MS);
      buckets.set(d.toISOString().slice(5, 10), 0);
    }
    for (const o of paidWindow) {
      const k = o.createdAt.toISOString().slice(5, 10);
      if (!buckets.has(k)) continue;
      const c =
        o.items.reduce((i, it) => i + it.commissionSnapshotCents, 0) / 100;
      buckets.set(k, (buckets.get(k) ?? 0) + c);
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

  const planMrrRows = aggregatePlanSubscriptionRows(subscriptions);
  const addonMrrTotalCents = featureAddonRows.reduce((s, r) => s + r.estimatedMrrCents, 0);
  const combinedMrrDirectionalCents = mrrCents + addonMrrTotalCents;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Revenue</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Financial throughput</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Paid order GMV, platform commission snapshots, billing-plan and add-on MRR estimates, coupons, refunds, booking
        deposit cash, and per-studio throughput. Rolling window defaults to <strong>30 days</strong>; switch to{" "}
        <strong>90 days</strong> for longer charts and per-studio totals. Use <strong>Breakdown</strong> for stream-level
        tables and commission trend.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-stone-500">Rolling window</span>
        <Link
          href={revenueHref(tab, qRaw, 30)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition",
            windowDays === 30
              ? "bg-amber-950 text-white"
              : "border border-stone-200 bg-white text-stone-600 hover:border-amber-300/60 hover:text-amber-950",
          )}
        >
          30 days
        </Link>
        <Link
          href={revenueHref(tab, qRaw, 90)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition",
            windowDays === 90
              ? "bg-amber-950 text-white"
              : "border border-stone-200 bg-white text-stone-600 hover:border-amber-300/60 hover:text-amber-950",
          )}
        >
          90 days
        </Link>
      </div>

      <nav className="mt-6 flex gap-1 border-b border-stone-200" aria-label="Revenue sections">
        <Link
          href={revenueHref("overview", qRaw, windowDays)}
          className={cn(
            "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition",
            tab === "overview"
              ? "border-amber-900 text-amber-950"
              : "border-transparent text-stone-500 hover:text-amber-950",
          )}
        >
          Overview
        </Link>
        <Link
          href={revenueHref("breakdown", qRaw, windowDays)}
          className={cn(
            "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition",
            tab === "breakdown"
              ? "border-amber-900 text-amber-950"
              : "border-transparent text-stone-500 hover:text-amber-950",
          )}
        >
          Breakdown
        </Link>
      </nav>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="GMV (paid orders, MTD)" value={eur(grossMonth)} hint={`${paidMonth.length} orders`} />
        <StatCard label="Platform take (MTD)" value={eur(commissionMonth)} hint="Sum of commission snapshots" />
        <StatCard label="MRR (subscription proxy)" value={eur(mrrCents)} hint={`${subscriptions.length} billable subs`} />
        <StatCard label="ARR (directional)" value={eur(arrCents)} hint="Monthlies ×12 + annuals" />
        <StatCard
          label={`Refund proxy (${windowLabel})`}
          value={eur(refundsCents)}
          hint={`${refundsWindow.length} order rows`}
        />
        <StatCard
          label={`Booking deposits (${windowLabel})`}
          value={eur(bookingCashWindow)}
          hint="Cash collected on bookings"
        />
        <StatCard
          label={`Coupon redemptions (${windowLabel})`}
          value={String(redemptions)}
          hint="All discount redemptions"
        />
      </div>

      {tab === "breakdown" ? (
        <>
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-amber-950">Streams ({windowLabel} + MRR)</h2>
            <p className="mt-1 text-xs text-stone-500">
              Commission and deposits are cash-basis in the window. MRR rows are directional (plan list + add-on catalog
              prices).
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={`Marketplace commission (${windowLabel})`}
                value={eur(commissionWindowCents)}
                hint="Snapshot on paid / settled order lines"
              />
              <StatCard
                label={`Class booking deposits (${windowLabel})`}
                value={eur(bookingCashWindow)}
                hint="Paid + partial deposit amounts"
              />
              <StatCard
                label="Billing plan MRR"
                value={eur(mrrCents)}
                hint={`${subscriptions.length} active / trialing / past_due`}
              />
              <StatCard
                label="Add-on MRR (est.)"
                value={eur(addonMrrTotalCents)}
                hint="Catalog or override × billable activations"
              />
            </div>
            <p className="mt-4 text-sm text-stone-600">
              <span className="font-medium text-amber-950">Combined directional MRR</span> (plans + add-ons):{" "}
              {eur(combinedMrrDirectionalCents)} — Stripe remains source of truth.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-amber-950">Billing plans</h2>
            <p className="mt-1 text-xs text-stone-500">Subscriber count and MRR contribution per billing plan.</p>
            <div className="mt-4">
              <DataTable
                rows={planMrrRows}
                empty="No billable subscriptions."
                columns={[
                  { key: "n", header: "Plan", cell: (r) => <span className="font-medium text-stone-800">{r.planName}</span> },
                  { key: "i", header: "Interval", cell: (r) => r.interval },
                  {
                    key: "p",
                    header: "List price",
                    cell: (r) => eur(r.priceCents),
                  },
                  { key: "c", header: "Subscribers", cell: (r) => String(r.subscriberCount) },
                  { key: "m", header: "MRR from plan", cell: (r) => eur(r.mrrCents) },
                ]}
              />
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-amber-950">Platform add-ons</h2>
            <p className="mt-1 text-xs text-stone-500">
              Activations in <code className="text-[11px]">active</code>,{" "}
              <code className="text-[11px]">trialing</code>, or{" "}
              <code className="text-[11px]">pending_cancel</code>. Effective price = override or catalog.
            </p>
            <p className="mt-2 text-sm">
              <Link
                href="/admin/platform-features"
                className="font-medium text-amber-900 underline-offset-2 hover:underline"
              >
                Manage catalog & pricing →
              </Link>
            </p>
            <div className="mt-4">
              <DataTable
                rows={featureAddonRows}
                empty="No billable add-on activations."
                columns={[
                  {
                    key: "feat",
                    header: "Feature",
                    cell: (r) => (
                      <div>
                        <span className="font-medium text-stone-800">{r.name}</span>
                        <p className="text-xs text-stone-500">{r.slug}</p>
                      </div>
                    ),
                  },
                  { key: "cat", header: "Catalog / mo", cell: (r) => eur(r.catalogPriceCents) },
                  { key: "act", header: "Activations", cell: (r) => String(r.billableActivations) },
                  { key: "mrr", header: "Est. MRR", cell: (r) => eur(r.estimatedMrrCents) },
                ]}
              />
            </div>
          </section>

          <div className="mt-10">
            <TimeSeriesChart
              title={`Platform commission / day (${windowLabel})`}
              subtitle="EUR, sum of line commission snapshots on monetized orders"
              points={commissionTrend}
              prefix="€"
            />
          </div>

          <section className="mt-10 rounded-2xl border border-stone-200 bg-stone-50/80 p-5">
            <h2 className="text-sm font-semibold text-amber-950">AI insight revenue</h2>
            <p className="mt-1 text-sm text-stone-600">
              No insight purchase ledger in the schema yet — wire this block when insight purchases ship (Prompt 3 /
              P5-G).
            </p>
          </section>
        </>
      ) : null}

      {tab === "overview" ? (
        <>
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-amber-950">Coupon performance ({windowLabel})</h2>
        <p className="mt-1 text-xs text-stone-500">
          Discount value attributed to redemptions (top {topCoupons.length} codes by value; sample capped at 3k rows).
        </p>
        <div className="mt-4">
          <DataTable
            rows={topCoupons}
            empty={`No redemptions in the last ${windowDays} days.`}
            columns={[
              { key: "c", header: "Code", cell: (r) => <code className="text-xs">{r.code}</code> },
              { key: "u", header: "Uses", cell: (r) => String(r.uses) },
              { key: "d", header: "Discount given", cell: (r) => eur(r.discountCents) },
            ]}
          />
        </div>
      </section>

      <div className="mt-10">
        <TimeSeriesChart
          title={`Paid GMV / day (${windowLabel})`}
          subtitle="EUR, marketplace orders"
          points={trend}
          prefix="€"
        />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-amber-950">Per-studio throughput ({windowLabel})</h2>
        <p className="mt-1 text-xs text-stone-500">
          Approved studios only, sorted by marketplace order GMV plus class booking deposits. Commission is the platform
          snapshot on order lines (same window as monetized orders above). Use search to narrow by studio name, city, or
          country.
        </p>
        <form method="get" className={`${ui.cardMuted} mt-4 max-w-md`}>
          {windowDays === 90 ? <input type="hidden" name="days" value="90" /> : null}
          <label className={ui.label} htmlFor="revenue-studio-q">
            Filter studios
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="revenue-studio-q"
              name="q"
              type="search"
              defaultValue={qRaw}
              placeholder="Name, city, or country"
              className={ui.input}
            />
            <button type="submit" className={ui.buttonSecondary}>
              Apply
            </button>
            {qRaw ? (
              <Link href={revenueHref("overview", "", windowDays)} className={`${ui.buttonGhost} self-center text-sm`}>
                Clear
              </Link>
            ) : null}
          </div>
        </form>
        <div className="mt-4 max-h-[min(28rem,70vh)] overflow-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <DataTable
            rows={studioThroughputFiltered}
            empty={
              studioThroughput.length === 0
                ? "No approved studios yet."
                : "No studios match this filter."
            }
            columns={[
              {
                key: "studio",
                header: "Studio",
                cell: (r) => (
                  <div>
                    <Link
                      href={`/admin/studios/${r.studioId}`}
                      className="font-medium text-amber-900 underline-offset-2 hover:underline"
                    >
                      {r.displayName}
                    </Link>
                    <p className="text-xs text-stone-500">
                      {r.city}, {r.country}
                    </p>
                  </div>
                ),
              },
              {
                key: "gmv",
                header: "Order GMV",
                cell: (r) => <span className="text-sm tabular-nums text-stone-800">{eur(r.orderGmvCents)}</span>,
              },
              {
                key: "comm",
                header: "Commission",
                cell: (r) => (
                  <span className="text-sm tabular-nums text-stone-700">{eur(r.orderCommissionCents)}</span>
                ),
              },
              {
                key: "dep",
                header: "Class deposits",
                cell: (r) => (
                  <span className="text-sm tabular-nums text-stone-700">{eur(r.bookingDepositsCents)}</span>
                ),
              },
              {
                key: "tot",
                header: "GMV + deposits",
                cell: (r) => (
                  <span className="text-sm font-medium tabular-nums text-amber-950">
                    {eur(r.orderGmvCents + r.bookingDepositsCents)}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </section>
        </>
      ) : null}

      <p className="mt-8 text-sm">
        <Link href="/admin/finance" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Finance engine · ledger & scenarios →
        </Link>
      </p>
    </div>
  );
}
