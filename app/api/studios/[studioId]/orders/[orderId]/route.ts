import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string; orderId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, orderId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: {
    fulfillmentStatus?: "pending" | "processing" | "shipped" | "delivered" | "ready_for_pickup" | "cancelled";
    trackingCarrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    shippingMethod?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validStatuses = ["pending", "processing", "shipped", "delivered", "ready_for_pickup", "cancelled"];
  if (body.fulfillmentStatus && !validStatuses.includes(body.fulfillmentStatus)) {
    return NextResponse.json({ error: "Invalid fulfillment status" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, items: { some: { vendorId: studioId } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      fulfillmentStatus: body.fulfillmentStatus,
      trackingCarrier: body.trackingCarrier?.trim() || null,
      trackingNumber: body.trackingNumber?.trim() || null,
      trackingUrl: body.trackingUrl?.trim() || null,
      shippingMethod: body.shippingMethod?.trim() || order.shippingMethod,
      orderStatus:
        body.fulfillmentStatus === "delivered"
          ? "fulfilled"
          : body.fulfillmentStatus === "cancelled"
            ? "cancelled"
            : order.orderStatus,
    },
  });
  return NextResponse.json({ order: updated });
}
