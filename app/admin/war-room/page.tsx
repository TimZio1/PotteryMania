import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "War room",
  "/admin/war-room",
  "Live operations and incident snapshot.",
);

export const dynamic = "force-dynamic";

function startOfUtcDay(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

type QueueItem = {
  label: string;
  count: number;
  href: string;
  hint: string;
  danger: boolean;
};

export default async function AdminWarRoomPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const last24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const staleOrderThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    pendingStudiosCount,
    suspendedStudiosCount,
    bookingsAwaitingApprovalCount,
    approvalBookingsPreview,
    manualRefundQueueCount,
    stalePendingOrdersCount,
    calendarErrorsLast30,
    newUsersToday,
    paidOrdersToday,
    paidOrders24h,
    recentAudit,
  ] = await Promise.all([
    prisma.studio.count({ where: { status: "pending_review" } }),
    prisma.studio.count({ where: { status: "suspended" } }),
    prisma.booking.count({ where: { bookingStatus: "awaiting_vendor_approval" } }),
    prisma.booking.findMany({
      where: { bookingStatus: "awaiting_vendor_approval" },
      orderBy: { createdAt: "asc" },
      take: 6,
      select: {
        id: true,
        createdAt: true,
        customerName: true,
        customerEmail: true,
        studio: { select: { id: true, displayName: true } },
        experience: { select: { title: true } },
      },
    }),
    prisma.bookingCancellation.count({ where: { refundOutcome: "manual_refund_review_required" } }),
    prisma.order.count({ where: { orderStatus: "pending", createdAt: { lt: staleOrderThreshold } } }),
    prisma.calendarSyncLog.count({
      where: { status: "error", createdAt: { gte: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { orderStatus: "paid", createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { orderStatus: "paid", createdAt: { gte: last24 } } }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        createdAt: true,
        action: true,
        entityType: true,
        entityId: true,
        actorUserId: true,
      },
    }),
  ]);

  const queues: QueueItem[] = [
    {
      label: "Studios pending review",
      count: pendingStudiosCount,
      href: "/admin/operations#pending-studios",
      hint: "Approve or reject to grow supply",
      danger: pendingStudiosCount > 0,
    },
    {
      label: "Studios suspended",
      count: suspendedStudiosCount,
      href: "/admin/users",
      hint: "Compliance or policy holds",
      danger: suspendedStudiosCount > 0,
    },
    {
      label: "Bookings awaiting vendor",
      count: bookingsAwaitingApprovalCount,
      href: "/admin/operations#booking-queue",
      hint: "Customer paid — vendor must confirm",
      danger: bookingsAwaitingApprovalCount > 3,
    },
    {
      label: "Manual refund queue",
      count: manualRefundQueueCount,
      href: "/admin/operations#ops-stats",
      hint: "Stripe / policy edge cases",
      danger: manualRefundQueueCount > 0,
    },
    {
      label: "Stale pending orders (>24h)",
      count: stalePendingOrdersCount,
      href: "/admin/operations#ops-stats",
      hint: "Webhook or checkout leakage",
      danger: stalePendingOrdersCount > 0,
    },
    {
      label: "Calendar sync errors (30d)",
      count: calendarErrorsLast30,
      href: "/admin/operations#ops-stats",
      hint: "Reliability signal",
      danger: calendarErrorsLast30 > 5,
    },
  ];

  const shortcuts = [
    { href: "/admin", label: "Executive overview" },
    { href: "/admin/operations", label: "Operations & queues" },
    { href: "/admin/finance", label: "Finance engine" },
    { href: "/admin/revenue", label: "Revenue" },
    { href: "/admin/audit", label: "Audit log" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/platform-features", label: "Platform add-ons" },
    { href: "/admin/marketplace-ranking", label: "Ranking tools (internal)" },
    { href: "/admin/settings", label: "Settings" },
    { href: "/", label: "Public homepage" },
    { href: "/dashboard/studio/new?setup=both", label: "Studio setup" },
  ] as const;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Hyperadmin</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">War room</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        One screen for triage: queue depth, the oldest bookings pending studio confirmation, today&apos;s commerce pulse,
        shortcuts, and fresh audit lines. Heavy charts stay on the executive overview.
      </p>

      <section className="mt-10" id="pulse">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Pulse (UTC day)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-[var(--muted)]">New users today</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{newUsersToday}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-[var(--muted)]">Paid orders today</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{paidOrdersToday}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-[var(--muted)]">Paid orders last 24h</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{paidOrders24h}</p>
          </div>
        </div>
      </section>

      <section className="mt-10" id="queues">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Queues</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Tap a card to jump to the right surface in Operations or Users.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {queues.map((q) => (
            <Link
              key={q.label}
              href={q.href}
              className={cn(
                "rounded-2xl border p-5 shadow-sm transition hover:border-amber-300/60 hover:bg-amber-50/30",
                q.danger && q.count > 0 ? "border-amber-300 bg-amber-50/50" : "border-stone-200 bg-white",
              )}
            >
              <p className="text-sm font-medium text-[var(--foreground)]">{q.label}</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{q.count}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">{q.hint}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Oldest bookings pending studio confirmation</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">FIFO-style preview — full list lives on Operations.</p>
          </div>
          <Link href="/admin/operations#booking-queue" className={cn(ui.buttonSecondary, "text-sm")}>
            Open booking queue
          </Link>
        </div>
        {approvalBookingsPreview.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">No bookings waiting on studios right now.</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white shadow-sm">
            {approvalBookingsPreview.map((b) => (
              <li key={b.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-stone-900">{b.experience.title}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {b.studio.displayName} · {b.customerName}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{b.customerEmail}</p>
                </div>
                <div className="text-xs text-[var(--muted)] sm:text-right">
                  <p>{b.createdAt.toISOString().slice(0, 16)} UTC</p>
                  <Link href={`/studios/${b.studio.id}`} className="text-amber-900 underline">
                    Studio profile
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Shortcuts</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {shortcuts.map((s) => (
            <Link key={s.href} href={s.href} className={cn(ui.buttonSecondary, "text-xs")}>
              {s.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent admin actions</h2>
          <Link href="/admin/audit" className={cn(ui.buttonGhost, "text-sm")}>
            Full audit →
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-2">Time (UTC)</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {recentAudit.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-[var(--muted)]">
                    {row.createdAt.toISOString().slice(0, 19)}
                  </td>
                  <td className="px-4 py-2 text-[var(--foreground)]">{row.action}</td>
                  <td className="px-4 py-2 text-xs text-[var(--muted)]">
                    {row.entityType}
                    {row.entityId ? (
                      <span className="ml-1 font-mono text-[11px] text-stone-400">{row.entityId.slice(0, 8)}…</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
