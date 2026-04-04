import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import VendorBookingActions from "@/components/dashboard/vendor-booking-actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function StudioPanelBookingsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const bookings = await prisma.booking.findMany({
    where: { studioId },
    orderBy: { createdAt: "desc" },
    include: {
      experience: { select: { id: true, title: true } },
      slot: true,
      cancellations: {
        select: { cancelledByRole: true, refundOutcome: true, createdAt: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    take: 100,
  });

  const pendingApproval = bookings.filter((b) => b.bookingStatus === "awaiting_vendor_approval");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className={ui.overline}>Operations</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Bookings</h1>
        {pendingApproval.length > 0 && (
          <p className="mt-2 text-sm text-amber-900">
            {pendingApproval.length} booking(s) awaiting your approval (payment captured; slot reserved).
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3 font-medium text-stone-900">
                  <Link href={`/classes/${booking.experience.id}`} className="hover:underline">
                    {booking.experience.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {booking.slot.slotDate.toISOString().slice(0, 10)}
                  <br />
                  {booking.slot.startTime}–{booking.slot.endTime}
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {booking.customerName}
                  <br />
                  <span className="text-xs">{booking.customerEmail}</span>
                </td>
                <td className="px-4 py-3 text-stone-600">{booking.bookingStatus}</td>
                <td className="px-4 py-3 text-stone-600">€{(booking.totalAmountCents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 align-top">
                  <VendorBookingActions bookingId={booking.id} bookingStatus={booking.bookingStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
