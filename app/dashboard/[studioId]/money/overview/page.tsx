import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Money overview", "money/overview", "Payouts, direct sales, and studio payment history.");
}

export default async function StudioMoneyOverviewPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const [orders, bookings, stripePayments] = await Promise.all([
    prisma.order.findMany({
      where: { paymentStatus: "paid", items: { some: { vendorId: studioId } } },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        items: { where: { vendorId: studioId } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.booking.findMany({
      where: {
        studioId,
        paymentStatus: { in: ["paid", "partial"] },
        bookingStatus: { notIn: ["cancelled_by_customer", "cancelled_by_vendor", "cancelled_by_admin"] },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { experience: { select: { title: true } } },
    }),
    prisma.payment.findMany({
      where: {
        provider: "stripe",
        order: { items: { some: { vendorId: studioId } } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        order: {
          select: {
            customerEmail: true,
            customerName: true,
            items: {
              where: { vendorId: studioId },
              take: 3,
              select: { itemType: true },
            },
          },
        },
      },
    }),
  ]);

  const bookingPaid = bookings.reduce((s, b) => s + (b.totalAmountCents - b.remainingBalanceCents), 0);
  const orderVendor = orders.reduce(
    (s, o) => s + o.items.reduce((t, i) => t + i.vendorAmountSnapshotCents * i.quantity, 0),
    0,
  );

  const stripeSucceeded = stripePayments.filter((p) => p.paymentStatus === "succeeded");
  const stripePending = stripePayments.filter((p) => p.paymentStatus === "pending");
  const stripeRefunded = stripePayments.filter(
    (p) => p.paymentStatus === "refunded" || p.paymentStatus === "partially_refunded",
  );
  const stripeSucceededCents = stripeSucceeded.reduce((s, p) => s + p.amountCents, 0);
  const stripePendingCents = stripePending.reduce((s, p) => s + p.amountCents, 0);
  const stripeRefundedCents = stripeRefunded.reduce((s, p) => s + p.amountCents, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className={ui.overline}>Money</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Overview</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Owner-facing totals and settlement signals. Payouts run through Stripe Connect — these numbers are for
          reconciliation, not bank deposits line-for-line. Raw payment rows and order lines live under{" "}
          <Link href={`/dashboard/${studioId}/money/activity`} className="font-medium text-amber-900 underline">
            Activity
          </Link>
          . Trends and page readiness are under{" "}
          <Link href={`/dashboard/${studioId}/money/reports`} className="font-medium text-amber-900 underline">
            Reports
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={ui.card}>
          <p className="text-sm text-[var(--muted)]">Product sales (your share)</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">€{(orderVendor / 100).toFixed(2)}</p>
        </div>
        <div className={ui.card}>
          <p className="text-sm text-[var(--muted)]">Experiences (collected)</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">€{(bookingPaid / 100).toFixed(2)}</p>
        </div>
        <div className={ui.card}>
          <p className="text-sm text-[var(--muted)]">Stripe captured (product sales)</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">€{(stripeSucceededCents / 100).toFixed(2)}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{stripeSucceeded.length} succeeded · €{(stripePendingCents / 100).toFixed(2)} pending</p>
        </div>
        <div className={ui.card}>
          <p className="text-sm text-[var(--muted)]">Refunded / partial (records)</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">€{(stripeRefundedCents / 100).toFixed(2)}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{stripeRefunded.length} payment row(s)</p>
        </div>
      </div>

      <div className={`${ui.card} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Payment activity</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Stripe captures, product lines, and class payment rows.</p>
        </div>
        <Link href={`/dashboard/${studioId}/money/activity`} className={ui.buttonPrimary}>
          Open activity
        </Link>
      </div>
    </div>
  );
}
