import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

function parseDays(req: Request): number {
  const u = new URL(req.url);
  const d = Number(u.searchParams.get("days"));
  return d === 7 || d === 30 || d === 90 ? d : 30;
}

function buildWeekBars(days: number) {
  const numBars = Math.max(1, Math.ceil(days / 7));
  const barMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const bars: { startMs: number; endMs: number; label: string }[] = [];
  for (let k = numBars - 1; k >= 0; k -= 1) {
    const endMs = now - k * barMs;
    const startMs = endMs - barMs;
    const start = new Date(startMs);
    bars.push({
      startMs,
      endMs,
      label: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-${String(start.getUTCDate()).padStart(2, "0")}`,
    });
  }
  return bars;
}

export async function GET(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const days = parseDays(req);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let orders: Awaited<ReturnType<typeof prisma.order.findMany>> = [];
  let bookings: Awaited<ReturnType<typeof prisma.booking.findMany>> = [];
  let products: Array<{ id: string; title: string }> = [];
  let experiences: Awaited<ReturnType<typeof prisma.experience.findMany>> = [];
  let bookingsInWindow: Array<{ createdAt: Date; bookingStatus: string; depositAmountCents: number }> = [];
  let ordersInWindow: Array<{ createdAt: Date; totalCents: number }> = [];

  try {
    [orders, bookings, products, experiences, bookingsInWindow, ordersInWindow] = await Promise.all([
      prisma.order.findMany({
        where: { items: { some: { vendorId: studioId } }, paymentStatus: "paid" },
        include: { items: true },
      }),
      prisma.booking.findMany({
        where: { studioId, paymentStatus: { in: ["paid", "partial"] } },
      }),
      prisma.product.findMany({
        where: { studioId },
        select: { id: true, title: true },
      }),
      prisma.experience.findMany({ where: { studioId } }),
      prisma.booking.findMany({
        where: { studioId, createdAt: { gte: since } },
        select: { createdAt: true, bookingStatus: true, depositAmountCents: true },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: since },
          items: { some: { vendorId: studioId } },
          paymentStatus: "paid",
        },
        select: { createdAt: true, totalCents: true },
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
      return NextResponse.json(
        { error: "Analytics is temporarily unavailable while product schema updates finish deploying." },
        { status: 503 },
      );
    }
    throw error;
  }

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

  const attendanceDen = bookingsInWindow.filter((b) =>
    ["confirmed", "completed", "no_show", "awaiting_vendor_approval"].includes(b.bookingStatus),
  ).length;
  const attendanceNum = bookingsInWindow.filter((b) => b.bookingStatus === "completed").length;
  const attendanceRate = attendanceDen > 0 ? Math.round((attendanceNum / attendanceDen) * 1000) / 10 : null;

  const weekBars = buildWeekBars(days);
  const bookingsPerWeek = weekBars.map((bar) => ({
    label: bar.label,
    count: bookingsInWindow.filter((b) => {
      const t = b.createdAt.getTime();
      return t >= bar.startMs && t < bar.endMs;
    }).length,
  }));

  const revenueByWeek = weekBars.map((bar) => {
    let cents = 0;
    for (const o of ordersInWindow) {
      const t = o.createdAt.getTime();
      if (t >= bar.startMs && t < bar.endMs) cents += o.totalCents;
    }
    for (const b of bookingsInWindow) {
      const t = b.createdAt.getTime();
      if (t >= bar.startMs && t < bar.endMs) cents += b.depositAmountCents;
    }
    return { label: bar.label, revenueCents: cents };
  });

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
      rangeDays: days,
      attendanceRate,
      attendanceCompleted: attendanceNum,
      attendanceDenominator: attendanceDen,
      bookingsPerWeek,
      revenueByWeek,
    },
  });
}
