import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { serializeStudioBookingsList } from "@/lib/serialize-studio-bookings-list";
import StudioBookingsClient from "@/components/dashboard/studio-bookings-client";
import TicketCheckInPanel from "@/components/dashboard/ticket-check-in-panel";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Sessions", "schedule/sessions", "Review and manage studio reservations.");
}

export default async function StudioScheduleSessionsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const bookings = await prisma.booking.findMany({
    where: { studioId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      studioId: true,
      experienceId: true,
      slotId: true,
      customerUserId: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      participantCount: true,
      seatType: true,
      ticketRef: true,
      bookingStatus: true,
      paymentStatus: true,
      totalAmountCents: true,
      depositAmountCents: true,
      remainingBalanceCents: true,
      depositPaidAt: true,
      remainderPaidAt: true,
      remainderPaymentLink: true,
      notes: true,
      cancellationPolicySnapshot: true,
      reminderScheduledAt: true,
      reminderSentAt: true,
      googleCalendarEventId: true,
      googleCalendarSyncedAt: true,
      googleCalendarLastError: true,
      createdAt: true,
      updatedAt: true,
      experience: { select: { id: true, title: true } },
      slot: true,
      bookingAddOns: {
        select: { addOnName: true, quantity: true, unitPriceCents: true },
      },
      intakeResponses: {
        select: { labelSnapshot: true, value: true, includeInInvoiceSnapshot: true },
      },
      cancellations: {
        select: { cancelledByRole: true, refundOutcome: true, createdAt: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    take: 200,
  });

  const rows = serializeStudioBookingsList(bookings);
  const pendingApprovalCount = bookings.filter((b) => b.bookingStatus === "awaiting_vendor_approval").length;

  const calLogs = await prisma.calendarSyncLog.findMany({
    where: { connection: { studioId }, bookingId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 400,
    select: { bookingId: true, status: true, message: true, createdAt: true },
  });
  const calendarSyncByBooking: Record<string, { status: string; message: string | null; at: string }> = {};
  for (const l of calLogs) {
    if (!l.bookingId || calendarSyncByBooking[l.bookingId]) continue;
    calendarSyncByBooking[l.bookingId] = {
      status: l.status,
      message: l.message,
      at: l.createdAt.toISOString(),
    };
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Schedule</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Sessions</h1>
        <p className="mt-2 text-sm text-stone-600">
          Filter by status, experience, and session date. Open a row for approvals, reschedules, participant details, and calendar exports.
        </p>
      </div>

      <TicketCheckInPanel studioId={studioId} />

      <StudioBookingsClient
        studioId={studioId}
        bookings={rows}
        pendingApprovalCount={pendingApprovalCount}
        calendarSyncByBooking={calendarSyncByBooking}
      />
    </div>
  );
}
