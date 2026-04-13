import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-session";
import { normalizeTicketScan } from "@/lib/bookings/ticket-qr";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ studioId: string }> };

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
        actorUserId: user.id,
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
