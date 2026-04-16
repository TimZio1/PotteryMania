import Link from "next/link";
import { prisma } from "@/lib/db";
import { ui } from "@/lib/ui-styles";

/** Line-by-line payment rows for Money → Activity (Stripe captures, sales, class payments). */
export default async function StudioMoneyLedger({ studioId }: { studioId: string }) {
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-amber-950">Stripe payment records</h2>
        <p className="mt-1 text-sm text-stone-600">Latest Stripe captures and refunds touching your direct product sales.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Buyer</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {stripePayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-stone-500">
                    No Stripe payment rows yet for this studio&apos;s direct sales.
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
        <h2 className="text-lg font-semibold text-amber-950">Recent product sales</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Buyer</th>
                <th className="px-3 py-2">Your share</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-stone-500">
                    No paid product orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const share = o.items.reduce((t, i) => t + i.vendorAmountSnapshotCents * i.quantity, 0);
                  return (
                    <tr key={o.id} className="border-b border-stone-100">
                      <td className="px-3 py-2 text-stone-600">{o.createdAt.toISOString().slice(0, 10)}</td>
                      <td className="px-3 py-2">{o.customerEmail}</td>
                      <td className="px-3 py-2">€{(share / 100).toFixed(2)}</td>
                      <td className="px-3 py-2">{o.paymentStatus}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-amber-950">Recent experience payments</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Experience</th>
                <th className="px-3 py-2">Guest</th>
                <th className="px-3 py-2">Collected</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-stone-500">
                    No qualifying class payments yet.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="border-b border-stone-100">
                    <td className="px-3 py-2 text-stone-600">{b.createdAt.toISOString().slice(0, 10)}</td>
                    <td className="px-3 py-2">{b.experience.title}</td>
                    <td className="px-3 py-2">{b.customerEmail}</td>
                    <td className="px-3 py-2">€{((b.totalAmountCents - b.remainingBalanceCents) / 100).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Link href={`/dashboard/${studioId}/schedule/sessions`} className={`${ui.buttonGhost} mt-3 text-sm`}>
          Open sessions
        </Link>
      </div>
    </div>
  );
}
