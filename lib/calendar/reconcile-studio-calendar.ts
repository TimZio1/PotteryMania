import { prisma } from "@/lib/db";
import { syncBookingToGoogleCalendar } from "@/lib/calendar/google-sync";

/**
 * Best-effort catch-up for confirmed bookings that should be on the studio calendar
 * but have no `googleCalendarEventId` (transient API errors, race, or new connection).
 */
export async function reconcilePendingStudioCalendarSyncs(limit: number): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const bookings = await prisma.booking.findMany({
    where: {
      bookingStatus: { in: ["confirmed", "completed"] },
      googleCalendarEventId: null,
      studio: {
        calendarConnections: {
          some: {
            provider: "google",
            connectionStatus: "connected",
            syncEnabled: true,
            OR: [{ accessToken: { not: null } }, { refreshToken: { not: null } }],
          },
        },
      },
    },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
    take: limit,
  });

  let succeeded = 0;
  let failed = 0;
  for (const b of bookings) {
    const r = await syncBookingToGoogleCalendar(b.id);
    if (r.ok) succeeded += 1;
    else failed += 1;
  }

  return { processed: bookings.length, succeeded, failed };
}
