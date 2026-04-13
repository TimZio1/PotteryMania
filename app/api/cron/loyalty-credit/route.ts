import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { prisma } from "@/lib/db";
import { logCronRun } from "@/lib/cron-audit";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const candidates = await prisma.booking.findMany({
      where: {
        bookingStatus: "completed",
        customerUserId: { not: null },
        slot: { slotDate: { lte: cutoff } },
        experience: { loyaltyPointsEarned: { gt: 0 } },
        studio: { loyaltyConfig: { is: { isEnabled: true } } },
      },
      select: {
        id: true,
        customerUserId: true,
        studioId: true,
        experience: { select: { loyaltyPointsEarned: true, title: true } },
      },
      take: 250,
    });

    let credited = 0;
    let skipped = 0;

    for (const booking of candidates) {
      if (!booking.customerUserId || booking.experience.loyaltyPointsEarned <= 0) {
        skipped += 1;
        continue;
      }
      const ok = await prisma.$transaction(async (tx) => {
        const existing = await tx.loyaltyTransaction.findFirst({
          where: { bookingId: booking.id, type: "earned_from_booking" },
          select: { id: true },
        });
        if (existing) return false;

        const balance = await tx.loyaltyBalance.upsert({
          where: {
            userId_studioId: {
              userId: booking.customerUserId!,
              studioId: booking.studioId,
            },
          },
          create: {
            userId: booking.customerUserId!,
            studioId: booking.studioId,
            pointsBalance: booking.experience.loyaltyPointsEarned,
            totalEarned: booking.experience.loyaltyPointsEarned,
          },
          update: {
            pointsBalance: { increment: booking.experience.loyaltyPointsEarned },
            totalEarned: { increment: booking.experience.loyaltyPointsEarned },
          },
          select: { id: true },
        });

        await tx.loyaltyTransaction.create({
          data: {
            balanceId: balance.id,
            type: "earned_from_booking",
            points: booking.experience.loyaltyPointsEarned,
            description: `Earned from ${booking.experience.title}`,
            bookingId: booking.id,
          },
        });
        return true;
      });

      if (ok) credited += 1;
      else skipped += 1;
    }

    const body = { ok: true as const, candidates: candidates.length, credited, skipped };
    void logCronRun("loyalty-credit", body);
    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    void logCronRun("loyalty-credit", { ok: false, error: message });
    return NextResponse.json({ ok: false, error: "Loyalty credit failed", message }, { status: 500 });
  }
}
