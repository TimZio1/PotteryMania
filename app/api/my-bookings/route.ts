import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const bookings = await prisma.booking.findMany({
    where: { customerUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      experience: { select: { id: true, title: true, coverImageUrl: true } },
      slot: { select: { slotDate: true, startTime: true, endTime: true, status: true } },
      studio: { select: { displayName: true } },
      cancellations: { select: { cancelledByRole: true, refundOutcome: true, createdAt: true }, take: 1, orderBy: { createdAt: "desc" } },
    },
    take: 100,
  });

  return NextResponse.json({ bookings });
}