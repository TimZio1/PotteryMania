import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Railway / external cron: GET with Authorization: Bearer CRON_SECRET
 * Cancels unpaid pending orders and their pending bookings (no capacity was reserved).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const minutes = Math.max(5, Number(process.env.PENDING_BOOKING_EXPIRY_MINUTES || 45) || 45);
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const orders = await tx.order.findMany({
      where: {
        orderStatus: "pending",
        paymentStatus: "pending",
        createdAt: { lt: cutoff },
      },
      include: { items: true },
    });

    let ordersCancelled = 0;
    let bookingsExpired = 0;

    for (const order of orders) {
      for (const item of order.items) {
        if (item.itemType !== "booking" || !item.bookingId) continue;
        const b = await tx.booking.findUnique({ where: { id: item.bookingId } });
        if (!b || b.bookingStatus !== "pending" || b.paymentStatus !== "pending") continue;

        await tx.booking.update({
          where: { id: b.id },
          data: {
            bookingStatus: "cancelled_by_admin",
            notes: [b.notes, `EXPIRED: unpaid checkout after ${minutes}m`].filter(Boolean).join("\n"),
          },
        });
        await tx.bookingAuditLog.create({
          data: {
            bookingId: b.id,
            actionType: "expired_unpaid_checkout",
            actorRole: "system",
            payload: { orderId: order.id, minutes } as Prisma.InputJsonValue,
          },
        });
        bookingsExpired += 1;
      }

      await tx.order.update({
        where: { id: order.id },
        data: { orderStatus: "cancelled", paymentStatus: "failed" },
      });
      ordersCancelled += 1;
    }

    return { ordersCancelled, bookingsExpired };
  });

  return NextResponse.json({ ok: true, cutoff: cutoff.toISOString(), ...result });
}
