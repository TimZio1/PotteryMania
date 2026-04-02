import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const studioId = searchParams.get("studioId");

  const bookings = await prisma.booking.findMany({
    where: studioId ? { studioId } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      studio: { select: { id: true, displayName: true } },
      experience: { select: { id: true, title: true } },
      slot: true,
    },
  });

  return NextResponse.json({ bookings });
}