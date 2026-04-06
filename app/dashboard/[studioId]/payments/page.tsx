import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function StudioPaymentsPage({ params }: Props) {
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

  const bookingPaid = bookings.reduce((s, b) => s + b.depositAmountCents, 0);
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
        <p className={ui.overline}>Money in</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Payments</h1>
        <p className="mt-2 text-sm text-stone-600">
          Tracking only — payouts use Stripe Connect. Shop totals are your share on listed orders; class totals are deposits on
          listed bookings. Stripe rows are gross charges on checkout (order-level), not your net share.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={ui.card}>
          <p className="text-sm text-stone-500">Shop (your share, listed)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">€{(orderVendor / 100).toFixed(2)}</p>
        </div>
        <div className={ui.card}>
          <p className="text-sm text-stone-500">Classes (deposits, listed)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">€{(bookingPaid / 100).toFixed(2)}</p>
        </div>
        <div className={ui.card}>
          <p className="text-sm text-stone-500">Stripe captured (orders)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">€{(stripeSucceededCents / 100).toFixed(2)}</p>
          <p className="mt-1 text-xs text-stone-500">{stripeSucceeded.length} succeeded · €{(stripePendingCents / 100).toFixed(2)} pending</p>
        </div>
        <div className={ui.card}>
          <p className="text-sm text-stone-500">Refunded / partial (records)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">€{(stripeRefundedCents / 100).toFixed(2)}</p>
          <p className="mt-1 text-xs text-stone-500">{stripeRefunded.length} payment row(s)</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-amber-950">Stripe payment records</h2>
        <p className="mt-1 text-sm text-stone-600">Latest checkout captures and refunds touching your product orders.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {stripePayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-stone-500">
                    No Stripe payment rows yet for this studio&apos;s orders.
                  </td>
                </tr>
              ) : (
                stripePayments.map((p) => {
                  const types = [...new Set(p.order.items.map((i) => i.itemType))];
                  const typeLabel = types.includes("product")
                    ? "Product"
                    : types.includes("booking")
                      ? "Booking"
                      : "Order";
                  return (
                    <tr key={p.id} className="border-b border-stone-100">
                      <td className="px-3 py-2 text-stone-600">{p.createdAt.toISOString().slice(0, 10)}</td>
                      <td className="px-3 py-2">
                        {p.order.customerName}
                        <br />
                        <span className="text-xs text-stone-500">{p.order.customerEmail}</span>
                      </td>
                      <td className="px-3 py-2 text-stone-600">{typeLabel}</td>
                      <td className="px-3 py-2">€{(p.amountCents / 100).toFixed(2)}</td>
                      <td className="px-3 py-2">{p.paymentStatus}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-amber-950">Recent orders</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Your share</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const share = o.items.reduce((t, i) => t + i.vendorAmountSnapshotCents * i.quantity, 0);
                return (
                  <tr key={o.id} className="border-b border-stone-100">
                    <td className="px-3 py-2 text-stone-600">{o.createdAt.toISOString().slice(0, 10)}</td>
                    <td className="px-3 py-2">{o.customerEmail}</td>
                    <td className="px-3 py-2">€{(share / 100).toFixed(2)}</td>
                    <td className="px-3 py-2">{o.paymentStatus}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Link href={`/dashboard/orders/${studioId}`} className={`${ui.buttonGhost} mt-3 text-sm`}>
          Full order workspace
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-amber-950">Recent class payments</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2">Guest</th>
                <th className="px-3 py-2">Collected</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-stone-100">
                  <td className="px-3 py-2 text-stone-600">{b.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-2">{b.experience.title}</td>
                  <td className="px-3 py-2">{b.customerEmail}</td>
                  <td className="px-3 py-2">€{(b.depositAmountCents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link href={`/dashboard/${studioId}/bookings`} className={`${ui.buttonGhost} mt-3 text-sm`}>
          All bookings
        </Link>
      </div>
    </div>
  );
}
