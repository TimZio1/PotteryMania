import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { prisma } from "@/lib/db";
import { logCronRun } from "@/lib/cron-audit";
import { sendBookingEmails } from "@/lib/email/booking-notify";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
    let failed = 0;
    for (const booking of bookings) {
      try {
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
      } catch {
        failed += 1;
      }
    }

    const body = { ok: true as const, sent, failed, candidates: bookings.length };
    void logCronRun("booking-reminders", body);
    return NextResponse.json(body, { status: failed > 0 ? 207 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    void logCronRun("booking-reminders", { ok: false, error: message });
    return NextResponse.json({ ok: false, error: "Booking reminders failed", message }, { status: 500 });
  }
}
