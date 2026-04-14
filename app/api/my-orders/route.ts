import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: {
      customerUserId: user.id,
      items: { some: { itemType: "product" } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      createdAt: true,
      orderStatus: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      totalCents: true,
      currency: true,
      trackingCarrier: true,
      trackingNumber: true,
      trackingUrl: true,
      shippingMethod: true,
      customerName: true,
      customerEmail: true,
      items: {
        where: { itemType: "product" },
        select: {
          id: true,
          quantity: true,
          priceSnapshotCents: true,
          product: {
            select: {
              title: true,
              images: {
                where: { isPrimary: true },
                select: { imageUrl: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    orders: orders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        priceSnapshotCents: item.priceSnapshotCents,
        title: item.product?.title ?? "Product",
        imageUrl: item.product?.images[0]?.imageUrl ?? null,
      })),
    })),
  });
}
