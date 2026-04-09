import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import type { Prisma } from "@prisma/client";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string }> };

const MAX_BATCH = 40;

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { bookingIds?: unknown };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("studio_bookings_mark_attended_batch_invalid_json", e, { studioId }, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawIds = Array.isArray(body.bookingIds) ? body.bookingIds : [];
  const bookingIds = [...new Set(rawIds.map(String).filter(Boolean))].slice(0, MAX_BATCH);
  if (bookingIds.length === 0) {
    return NextResponse.json({ error: "bookingIds required" }, { status: 400 });
  }

  let marked = 0;
  await prisma.$transaction(async (tx) => {
    for (const bookingId of bookingIds) {
      const booking = await tx.booking.findFirst({
        where: {
          id: bookingId,
          studioId,
          bookingStatus: "confirmed",
        },
        select: { id: true },
      });
      if (!booking) continue;

      await tx.booking.update({
        where: { id: bookingId },
        data: { bookingStatus: "completed" },
      });
      await tx.bookingAuditLog.create({
        data: {
          bookingId,
          actionType: "vendor_marked_completed",
          actorRole: "vendor",
          actorUserId: user.id,
          payload: { batch: true } as Prisma.InputJsonValue,
        },
      });
      marked += 1;
    }
  });

  return NextResponse.json({ ok: true, marked });
}
