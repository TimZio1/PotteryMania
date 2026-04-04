import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import VendorBookingActions from "@/components/dashboard/vendor-booking-actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function StudioBookingsPage({ params }: Props) {
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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-amber-800">
        &larr; Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-amber-950">{studio.displayName} bookings</h1>
      {pendingApproval.length > 0 && (
        <p className="mt-2 text-sm text-amber-900">
          {pendingApproval.length} booking(s) awaiting your approval (payment already captured; slot reserved).
        </p>
      )}
      <div className="mt-6 space-y-3">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className={`rounded-lg border bg-white p-4 ${
              booking.bookingStatus === "awaiting_vendor_approval"
                ? "border-amber-400 ring-1 ring-amber-200"
                : "border-stone-200"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-stone-900">{booking.experience.title}</p>
                <p className="text-sm text-stone-500">
                  {booking.slot.slotDate.toISOString().slice(0, 10)} {booking.slot.startTime}-{booking.slot.endTime}
                </p>
                <p className="text-sm text-stone-500">
                  {booking.customerName} ({booking.customerEmail})
                </p>
                {booking.ticketRef ? (
                  <p className="text-xs font-medium text-amber-900">Ref: {booking.ticketRef}</p>
                ) : null}
              </div>
              <div className="text-right text-sm text-stone-500">
                <p>{booking.participantCount} participants</p>
                {booking.seatType ? <p>Seat: {booking.seatType}</p> : null}
                <p>&euro;{(booking.totalAmountCents / 100).toFixed(2)}</p>
                {booking.remainingBalanceCents > 0 ? (
                  <p className="text-xs">
                    Paid: €{(booking.depositAmountCents / 100).toFixed(2)} · Due: €
                    {(booking.remainingBalanceCents / 100).toFixed(2)}
                  </p>
                ) : null}
                <p>{booking.bookingStatus} / {booking.paymentStatus}</p>
                {booking.cancellations.length > 0 && (
                  <p className="text-xs text-red-600">
                    Cancelled by {booking.cancellations[0].cancelledByRole}
                  </p>
                )}
              </div>
            </div>
            <VendorBookingActions
              bookingId={booking.id}
              bookingStatus={booking.bookingStatus}
            />
          </div>
        ))}
        {bookings.length === 0 && <p className="px-4 py-6 text-stone-500">No bookings yet.</p>}
      </div>
    </div>
  );
}