import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { normalizeTicketScan } from "@/lib/bookings/ticket-qr";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userId = auth.user.id;

  let body: { ticketRef?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ticketRef = normalizeTicketScan(typeof body.ticketRef === "string" ? body.ticketRef : "");
  if (!ticketRef) {
    return NextResponse.json({ error: "ticketRef required" }, { status: 400 });
  }

  const booking = await prisma.booking.findFirst({
    where: { studioId, ticketRef },
    select: {
      id: true,
      bookingStatus: true,
      ticketRef: true,
      customerName: true,
      experience: { select: { title: true } },
      slot: { select: { slotDate: true, startTime: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Ticket not found for this studio" }, { status: 404 });
  }

  if (booking.bookingStatus === "completed") {
    return NextResponse.json({
      ok: true,
      alreadyCompleted: true,
      bookingId: booking.id,
      ticketRef: booking.ticketRef,
      customerName: booking.customerName,
      experienceTitle: booking.experience.title,
    });
  }

  if (booking.bookingStatus !== "confirmed") {
    return NextResponse.json(
      { error: `This ticket cannot be checked in from status: ${booking.bookingStatus.replace(/_/g, " ")}` },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: { bookingStatus: "completed" },
    });
    await tx.bookingAuditLog.create({
      data: {
        bookingId: booking.id,
        actionType: "vendor_marked_completed",
        actorRole: "vendor",
        actorUserId: userId,
        payload: { via: "ticket_scan", ticketRef } as Prisma.InputJsonValue,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    bookingId: booking.id,
    ticketRef: booking.ticketRef,
    customerName: booking.customerName,
    experienceTitle: booking.experience.title,
    slotDate: booking.slot.slotDate.toISOString(),
    startTime: booking.slot.startTime,
    bookingStatus: "completed",
  });
}
