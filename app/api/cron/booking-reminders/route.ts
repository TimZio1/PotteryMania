import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendBookingEmails } from "@/lib/email/booking-notify";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = new Date(Date.now() + 23 * 60 * 60 * 1000);
  const end = new Date(Date.now() + 25 * 60 * 60 * 1000);
  const bookings = await prisma.booking.findMany({
    where: {
      bookingStatus: { in: ["confirmed", "awaiting_vendor_approval"] },
      reminderSentAt: null,
      slot: { slotDate: { gte: start, lte: end } },
    },
    include: {
      experience: true,
      slot: true,
      studio: true,
    },
    take: 100,
  });

  let sent = 0;
  for (const booking of bookings) {
    await sendBookingEmails({
      customerEmail: booking.customerEmail,
      studioEmail: booking.studio.email,
      subject: `Reminder: ${booking.experience.title} is tomorrow`,
      customerHtml: `<p>Hi ${booking.customerName},</p><p>This is a reminder for <strong>${booking.experience.title}</strong> on ${booking.slot.slotDate.toISOString().slice(0, 10)} at ${booking.slot.startTime}.</p>`,
      studioHtml: `<p>Reminder sent to ${booking.customerName} for <strong>${booking.experience.title}</strong>.</p>`,
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reminderSentAt: new Date() },
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
