import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [orders, bookings, products, experiences] = await Promise.all([
    prisma.order.findMany({
      where: { items: { some: { vendorId: studioId } }, paymentStatus: "paid" },
      include: { items: true },
    }),
    prisma.booking.findMany({
      where: { studioId, paymentStatus: { in: ["paid", "partial"] } },
    }),
    prisma.product.findMany({ where: { studioId } }),
    prisma.experience.findMany({ where: { studioId } }),
  ]);

  const orderRevenueCents = orders.reduce((sum, order) => sum + order.totalCents, 0);
  const bookingRevenueCents = bookings.reduce((sum, booking) => sum + booking.depositAmountCents, 0);

  const topProducts = products
    .map((product) => ({
      id: product.id,
      title: product.title,
      orders: orders.reduce(
        (count, order) =>
          count + order.items.filter((item) => item.productId === product.id).reduce((n, item) => n + item.quantity, 0),
        0
      ),
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5);

  const topExperiences = experiences
    .map((experience) => ({
      id: experience.id,
      title: experience.title,
      bookings: bookings.filter((booking) => booking.experienceId === experience.id).length,
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);

  return NextResponse.json({
    metrics: {
      orderRevenueCents,
      bookingRevenueCents,
      totalOrders: orders.length,
      totalBookings: bookings.length,
      totalProducts: products.length,
      totalExperiences: experiences.length,
      topProducts,
      topExperiences,
    },
  });
}
