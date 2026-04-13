import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== userId) return null;
  return studio;
}

export async function GET(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const from = new Date(searchParams.get("from") ?? Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = new Date(searchParams.get("to") ?? Date.now());

  const [bookings, orders, experiences] = await Promise.all([
    prisma.booking.findMany({
      where: {
        studioId,
        bookingStatus: { in: ["confirmed", "completed"] },
        createdAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        totalAmountCents: true,
        experienceId: true,
      },
    }),
    prisma.orderItem.findMany({
      where: {
        vendorId: studioId,
        order: { createdAt: { gte: from, lte: to }, paymentStatus: "paid" },
      },
      select: {
        priceSnapshotCents: true,
        quantity: true,
        order: { select: { taxCents: true, totalCents: true } },
      },
    }),
    prisma.experience.findMany({
      where: { studioId },
      select: { id: true, title: true, taxRateBps: true },
    }),
  ]);

  const taxRateByExperience = new Map(experiences.map((exp) => [exp.id, exp.taxRateBps]));
  const bookingTaxCents = bookings.reduce((sum, booking) => {
    const bps = taxRateByExperience.get(booking.experienceId) ?? 0;
    return sum + Math.round((booking.totalAmountCents * bps) / 10_000);
  }, 0);
  const bookingGrossCents = bookings.reduce((sum, booking) => sum + booking.totalAmountCents, 0);

  const orderGrossCents = orders.reduce((sum, item) => sum + item.priceSnapshotCents * item.quantity, 0);
  const orderTaxCents = orders.reduce((sum, item) => sum + (item.order.taxCents || 0), 0);

  return NextResponse.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    bookingGrossCents,
    bookingTaxCents,
    orderGrossCents,
    orderTaxCents,
    grossRevenueCents: bookingGrossCents + orderGrossCents,
    taxCollectedCents: bookingTaxCents + orderTaxCents,
    netRevenueCents: bookingGrossCents + orderGrossCents - (bookingTaxCents + orderTaxCents),
    experienceTaxRates: experiences.map((exp) => ({ id: exp.id, title: exp.title, taxRateBps: exp.taxRateBps })),
  });
}
