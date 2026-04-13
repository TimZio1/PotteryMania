import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ensureBookingInvoice } from "@/lib/invoices/create";

type Ctx = { params: Promise<{ bookingId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { bookingId } = await ctx.params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, customerUserId: true, studioId: true, studio: { select: { ownerUserId: true } } },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCustomer = booking.customerUserId === user.id;
  const isOwner = booking.studio.ownerUserId === user.id;
  const isAdmin = user.role === "admin" || user.role === "hyper_admin";
  if (!isCustomer && !isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const invoice = await ensureBookingInvoice(booking.id);
  if (!invoice) return NextResponse.json({ error: "Could not generate invoice" }, { status: 500 });

  return NextResponse.json({ invoice });
}
