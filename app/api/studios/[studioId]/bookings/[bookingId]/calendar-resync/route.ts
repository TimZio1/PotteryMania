import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { syncBookingToGoogleCalendar } from "@/lib/calendar/google-sync";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string; bookingId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId, bookingId } = await ctx.params;
  if (!studioId || !bookingId) {
    return NextResponse.json({ error: "Missing studio or booking" }, { status: 400 });
  }

  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, studioId },
    select: { id: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await syncBookingToGoogleCalendar(bookingId);
  return NextResponse.json(result);
}
