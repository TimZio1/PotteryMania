import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/auth-session";
import { rescheduleBooking } from "@/lib/bookings/reschedule";
import { sendBookingEmails } from "@/lib/email/booking-notify";

type Ctx = { params: Promise<{ bookingId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { bookingId } = await ctx.params;
  let body: { newSlotId?: string; reason?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newSlotId = typeof body.newSlotId === "string" ? body.newSlotId : "";
  if (!newSlotId) {
    return NextResponse.json({ error: "newSlotId required" }, { status: 400 });
  }

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

  const result = await rescheduleBooking({
    bookingId,
    newSlotId,
    role,
    userId: user.id,
    reason: body.reason,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    const newSlot = await prisma.bookingSlot.findUnique({ where: { id: newSlotId } });
    const oldDate = booking.slot.slotDate.toISOString().slice(0, 10);
    const newDate = newSlot?.slotDate.toISOString().slice(0, 10) ?? "unknown";
    const newTime = newSlot?.startTime ?? "";
    const subject = `Booking rescheduled: ${booking.experience.title}`;
    const info = `<p>Experience: <strong>${booking.experience.title}</strong></p>
      <p>Old slot: ${oldDate} at ${booking.slot.startTime}</p>
      <p>New slot: ${newDate} at ${newTime}</p>
      <p>Rescheduled by: ${role}</p>`;
    if (booking.studio.email) {
      await sendBookingEmails({
        customerEmail: booking.customerEmail,
        studioEmail: booking.studio.email,
        subject,
        customerHtml: `<h1>Booking rescheduled</h1>${info}`,
        studioHtml: `<h1>Booking rescheduled</h1>${info}`,
      });
    }
  } catch (e) {
    console.error("[reschedule-email]", e);
  }

  return NextResponse.json(result);
}