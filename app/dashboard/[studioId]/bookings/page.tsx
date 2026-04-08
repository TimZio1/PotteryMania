import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { serializeStudioBookingsList } from "@/lib/serialize-studio-bookings-list";
import StudioBookingsClient from "@/components/dashboard/studio-bookings-client";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Bookings", "bookings", "Review and manage class bookings.");
}

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
        <p className={ui.overline}>Operations</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Bookings</h1>
        <p className="mt-2 text-sm text-stone-600">
          Filter by status, class, and session date. Open a row for actions, reschedule, and calendar export. Batch-mark confirmed
          bookings as attended.
        </p>
      </div>

      <StudioBookingsClient
        studioId={studioId}
        bookings={rows}
        pendingApprovalCount={pendingApprovalCount}
        calendarSyncByBooking={calendarSyncByBooking}
      />
    </div>
  );
}
