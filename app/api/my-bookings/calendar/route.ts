import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { buildBookingsIcsCalendar } from "@/lib/calendar/booking-ics";
import { loadCustomerBookingIcsRows } from "@/lib/calendar/load-booking-ics-rows";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rows = await loadCustomerBookingIcsRows(user.id);
  const body = buildBookingsIcsCalendar(rows, "PotteryMania — my bookings");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="potterymania-my-bookings.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
