import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/auth-session";
import { cancelBooking } from "@/lib/bookings/cancel";
import { sendBookingEmails } from "@/lib/email/booking-notify";

type Ctx = { params: Promise<{ bookingId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { bookingId } = await ctx.params;
  let body: { reason?: string } = {};
  try {
    body = await req.json();
  } catch {}

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      studio: { select: { ownerUserId: true, displayName: true, email: true } },
      experience: { select: { title: true } },
      slot: true,
    },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  let role: "customer" | "vendor" | "admin";
  if (isAdminRole(user.role)) {
    role = "admin";
  } else if (booking.studio.ownerUserId === user.id) {
    role = "vendor";
  } else if (booking.customerUserId === user.id) {
    role = "customer";
  } else {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const result = await cancelBooking({
    bookingId,
    role,
    userId: user.id,
    reason: body.reason,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    const slotDate = booking.slot.slotDate.toISOString().slice(0, 10);
    const subject = `Booking cancelled: ${booking.experience.title} on ${slotDate}`;
    const info = `<p>Experience: <strong>${booking.experience.title}</strong></p>
      <p>Date: ${slotDate} at ${booking.slot.startTime}</p>
      <p>Cancelled by: ${role}</p>
      <p>Refund outcome: ${result.refundOutcome}</p>`;
    if (booking.studio.email) {
      await sendBookingEmails({
        customerEmail: booking.customerEmail,
        studioEmail: booking.studio.email,
        subject,
        customerHtml: `<h1>Booking cancelled</h1>${info}`,
        studioHtml: `<h1>Booking cancelled</h1>${info}`,
      });
    }
  } catch (e) {
    console.error("[cancel-email]", e);
  }

  return NextResponse.json(result);
}