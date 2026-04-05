import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { adminBookingsWhere } from "@/lib/admin-bookings-query";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const studioId = searchParams.get("studioId");
  const bookingStatus = searchParams.get("bookingStatus");
  const paymentStatus = searchParams.get("paymentStatus");
  const q = searchParams.get("q");
  const slotFrom = searchParams.get("slotFrom");
  const slotTo = searchParams.get("slotTo");
  const limitRaw = searchParams.get("limit");
  const limit = Math.min(500, Math.max(20, Number(limitRaw) || 200));

  const where = adminBookingsWhere({
    studioId,
    bookingStatus,
    paymentStatus,
    q,
    slotFrom,
    slotTo,
  });

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      studio: { select: { id: true, displayName: true } },
      experience: { select: { id: true, title: true } },
      slot: true,
    },
  });

  return NextResponse.json({ bookings });
}