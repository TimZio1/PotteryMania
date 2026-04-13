import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { prisma } from "@/lib/db";
import { logCronRun } from "@/lib/cron-audit";
import { renderEmailShell, sendEmailMessages } from "@/lib/email/base";

function atUtcStart(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const now = new Date();
    const todayStart = atUtcStart(now);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const studios = await prisma.studio.findMany({
      where: {
        status: "approved",
        dailyReportEnabled: true,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
      },
      take: 200,
    });

    let sent = 0;
    for (const studio of studios) {
      const [todayBookings, newBookings, cancellations, upcoming] = await Promise.all([
        prisma.booking.count({
          where: { studioId: studio.id, slot: { slotDate: { gte: todayStart, lt: tomorrowStart } } },
        }),
        prisma.booking.count({
          where: { studioId: studio.id, createdAt: { gte: yesterday, lt: now } },
        }),
        prisma.booking.count({
          where: {
            studioId: studio.id,
            updatedAt: { gte: yesterday, lt: now },
            bookingStatus: { in: ["cancelled_by_admin", "cancelled_by_customer", "cancelled_by_vendor"] },
          },
        }),
        prisma.booking.count({
          where: { studioId: studio.id, slot: { slotDate: { gte: todayStart, lt: weekEnd } } },
        }),
      ]);

      const html = renderEmailShell({
        eyebrow: "Daily report",
        title: `${studio.displayName} daily summary`,
        intro: "Here is your booking activity snapshot for the last 24 hours.",
        bodyHtml: `
          <p><strong>Today's bookings:</strong> ${todayBookings}</p>
          <p><strong>New bookings (last 24h):</strong> ${newBookings}</p>
          <p><strong>Cancellations (last 24h):</strong> ${cancellations}</p>
          <p><strong>Upcoming bookings (next 7 days):</strong> ${upcoming}</p>
        `,
      });

      await sendEmailMessages([{ to: studio.email, subject: `Daily report — ${studio.displayName}`, html }]);
      sent += 1;
    }

    const body = { ok: true as const, sent, scanned: studios.length };
    void logCronRun("daily-report", body);
    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    void logCronRun("daily-report", { ok: false, error: message });
    return NextResponse.json({ ok: false, error: "Daily report failed", message }, { status: 500 });
  }
}
