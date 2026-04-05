import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { AdminEarlyAccessList } from "../admin-early-access";
import { AdminStudios } from "../admin-studios";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

export default async function AdminOperationsPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const now = new Date();
  const staleOrderThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const staleCartThreshold = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const [
    pending,
    earlyAccessRows,
    stalePendingOrdersCount,
    staleCartsCount,
    manualRefundQueueCount,
    bookingsAwaitingApprovalCount,
    calendarErrorsLast30,
    cronRuns,
    manualRefundRows,
  ] = await Promise.all([
    prisma.studio.findMany({
      where: { status: "pending_review" },
      orderBy: { updatedAt: "asc" },
      include: { owner: { select: { email: true } } },
    }),
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
    prisma.order.count({ where: { orderStatus: "pending", createdAt: { lt: staleOrderThreshold } } }),
    prisma.cart.count({
      where: {
        updatedAt: { lt: staleCartThreshold },
        items: { some: {} },
        lastRecoveryEmailSentAt: null,
      },
    }),
    prisma.bookingCancellation.count({ where: { refundOutcome: "manual_refund_review_required" } }),
    prisma.booking.count({ where: { bookingStatus: "awaiting_vendor_approval" } }),
    prisma.calendarSyncLog.count({
      where: { status: "error", createdAt: { gte: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.adminAuditLog.findMany({
      where: { action: "cron.run" },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, createdAt: true, entityId: true, afterJson: true },
    }),
    prisma.bookingCancellation.findMany({
      where: { refundOutcome: "manual_refund_review_required" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        booking: {
          select: {
            id: true,
            customerEmail: true,
            customerName: true,
            totalAmountCents: true,
            bookingStatus: true,
            experience: { select: { title: true } },
            studio: { select: { displayName: true } },
          },
        },
      },
    }),
  ]);

  const cronEndpoints = [
    { name: "abandoned-carts", path: "/api/cron/abandoned-carts" },
    { name: "booking-reminders", path: "/api/cron/booking-reminders" },
    { name: "expire-pending-bookings", path: "/api/cron/expire-pending-bookings" },
    { name: "finance-reconcile", path: "/api/cron/finance-reconcile" },
    { name: "ranking-update", path: "/api/cron/ranking-update" },
  ] as const;

  function cronSummary(payload: unknown): string {
    if (!payload || typeof payload !== "object") return "—";
    const p = payload as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof p.sent === "number") parts.push(`sent ${p.sent}`);
    if (typeof p.candidates === "number") parts.push(`candidates ${p.candidates}`);
    if (typeof p.scanned === "number") parts.push(`scanned ${p.scanned}`);
    if (typeof p.ordersCancelled === "number") parts.push(`orders cancelled ${p.ordersCancelled}`);
    if (typeof p.bookingsExpired === "number") parts.push(`bookings expired ${p.bookingsExpired}`);
    if (typeof p.orderBackfillProcessed === "number") parts.push(`order backfill ${p.orderBackfillProcessed}`);
    if (typeof p.stripeRows === "number") parts.push(`stripe rows ${p.stripeRows}`);
    if (typeof p.studiosProcessed === "number") parts.push(`studios ${p.studiosProcessed}`);
    if (typeof p.durationMs === "number") parts.push(`${p.durationMs}ms`);
    if (parts.length) return parts.join(" · ");
    try {
      return JSON.stringify(p).slice(0, 140);
    } catch {
      return "…";
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Operations</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Queues & recovery</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Review velocity, refund risk, and live booking traffic. Cron jobs cover reminders and abandoned carts;
        this view is for human intervention.
      </p>

      <div id="ops-stats" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Studios pending review" value={String(pending.length)} hint="Approve or reject to grow supply" />
        <StatCard
          label="Bookings awaiting vendor"
          value={String(bookingsAwaitingApprovalCount)}
          hint="SLA risk if this piles up"
        />
        <StatCard
          label="Manual refund queue"
          value={String(manualRefundQueueCount)}
          hint="Stripe or policy edge cases"
        />
        <StatCard label="Stale pending orders" value={String(stalePendingOrdersCount)} hint=">24h in pending" />
        <StatCard
          label="Stale carts (no recovery mail)"
          value={String(staleCartsCount)}
          hint="Abandoned cart cron picks these up"
        />
        <StatCard label="Calendar sync errors (30d)" value={String(calendarErrorsLast30)} hint="Reliability signal" />
        <StatCard
          label="Cron auth"
          value={process.env.CRON_SECRET ? "CRON_SECRET set" : "Missing secret"}
          hint="Railway cron must send Authorization: Bearer …"
        />
      </div>

      <section id="manual-refund-queue" className="mt-10">
        <h2 className="text-lg font-semibold text-amber-950">Manual refund queue</h2>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Cancellations where Stripe automation could not finish the refund. Complete in Stripe Dashboard, then update
          records or leave notes in{" "}
          <Link href="/admin/audit" className="font-medium text-amber-900 underline-offset-2 hover:underline">
            Audit
          </Link>
          .
        </p>
        <div className="mt-4">
          <DataTable
            rows={manualRefundRows}
            empty="No manual refund cases. When webhooks or policy edge cases require human refunds, rows appear here."
            columns={[
              {
                key: "when",
                header: "Flagged (UTC)",
                cell: (r) => (
                  <span className="whitespace-nowrap text-xs text-stone-500">
                    {r.createdAt.toISOString().slice(0, 19)}
                  </span>
                ),
              },
              {
                key: "booking",
                header: "Booking",
                cell: (r) => (
                  <Link
                    href={`/admin/bookings/${r.booking.id}`}
                    className="text-sm font-medium text-amber-900 underline-offset-2 hover:underline"
                  >
                    Open
                  </Link>
                ),
              },
              {
                key: "guest",
                header: "Guest",
                cell: (r) => (
                  <div>
                    <div className="text-sm text-stone-800">{r.booking.customerName}</div>
                    <div className="text-xs text-stone-500">{r.booking.customerEmail}</div>
                  </div>
                ),
              },
              {
                key: "class",
                header: "Experience / studio",
                cell: (r) => (
                  <div className="text-xs text-stone-600">
                    <div className="font-medium text-stone-800">{r.booking.experience.title}</div>
                    <div>{r.booking.studio.displayName}</div>
                  </div>
                ),
              },
              {
                key: "amt",
                header: "Total",
                cell: (r) => (
                  <span className="tabular-nums text-sm">€{(r.booking.totalAmountCents / 100).toFixed(2)}</span>
                ),
              },
              {
                key: "st",
                header: "Status",
                cell: (r) => <code className="text-xs">{r.booking.bookingStatus}</code>,
              },
              {
                key: "refund",
                header: "Refund ¢",
                cell: (r) => <span className="text-xs tabular-nums">{r.refundAmountCents}</span>,
              },
            ]}
          />
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-amber-950">Scheduled jobs</h2>
        <p className="mt-2 text-sm text-stone-600">
          HTTP GET endpoints (secure with <code className="text-xs">CRON_SECRET</code>). Each successful run writes to the
          audit log as <code className="text-xs">cron.run</code>.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-stone-700">
          {cronEndpoints.map((j) => (
            <li key={j.name}>
              <span className="font-mono text-xs text-amber-900">{j.path}</span>
              <span className="ml-2 text-xs text-stone-500">{j.name}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-stone-500">
          See also{" "}
          <Link href="/admin/audit" className="font-medium text-amber-900 underline-offset-2 hover:underline">
            Audit
          </Link>{" "}
          for full history.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-amber-950">Recent cron runs</h2>
        <div className="mt-4">
          <DataTable
            rows={cronRuns}
            empty="No cron runs logged yet. After the next Railway execution, rows appear here."
            columns={[
              {
                key: "t",
                header: "Time (UTC)",
                cell: (r) => <span className="whitespace-nowrap text-xs">{r.createdAt.toISOString().slice(0, 19)}</span>,
              },
              {
                key: "job",
                header: "Job",
                cell: (r) => <code className="text-xs">{r.entityId ?? "—"}</code>,
              },
              {
                key: "sum",
                header: "Summary",
                cell: (r) => <span className="text-xs text-stone-600">{cronSummary(r.afterJson)}</span>,
              },
            ]}
          />
        </div>
      </section>

      <div id="pending-studios">
        <AdminStudios initialStudios={pending} />
      </div>
      <AdminEarlyAccessList rows={earlyAccessRows} />
      <section id="booking-queue" className="mt-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-amber-950">Bookings</h2>
        <p className="mt-2 text-sm text-stone-600">
          Search, filter by studio and session date, and open full booking detail (orders, cancellations, reschedules) on
          the dedicated console.
        </p>
        <Link href="/admin/bookings" className={`${ui.buttonPrimary} mt-4 inline-flex`}>
          Open booking console
        </Link>
      </section>
    </div>
  );
}
