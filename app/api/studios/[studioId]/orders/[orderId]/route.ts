import { NextResponse } from "next/server";
import type { FulfillmentStatus, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";
import { orderShippedCopy, sendOrderEmails } from "@/lib/email/order-notify";

type Ctx = { params: Promise<{ studioId: string; orderId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId, orderId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

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

  const validStatuses: FulfillmentStatus[] = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "ready_for_pickup",
    "cancelled",
  ];
  if (body.fulfillmentStatus && !validStatuses.includes(body.fulfillmentStatus)) {
    return NextResponse.json({ error: "Invalid fulfillment status" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, items: { some: { vendorId: studioId } } },
    include: {
      items: {
        select: { vendorId: true },
      },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const distinctVendorIds = new Set(order.items.map((item) => item.vendorId));
  if (distinctVendorIds.size !== 1 || !distinctVendorIds.has(studioId)) {
    return NextResponse.json(
      { error: "This order includes multiple studios and must be managed by platform support." },
      { status: 409 },
    );
  }

  const data: Prisma.OrderUpdateInput = {};

  if (body.fulfillmentStatus) {
    data.fulfillmentStatus = body.fulfillmentStatus;
    let nextOrderStatus: OrderStatus = order.orderStatus;
    if (body.fulfillmentStatus === "delivered") nextOrderStatus = "fulfilled";
    else if (body.fulfillmentStatus === "cancelled") nextOrderStatus = "cancelled";
    data.orderStatus = nextOrderStatus;
  }
  if ("trackingCarrier" in body) data.trackingCarrier = body.trackingCarrier?.trim() || null;
  if ("trackingNumber" in body) data.trackingNumber = body.trackingNumber?.trim() || null;
  if ("trackingUrl" in body) data.trackingUrl = body.trackingUrl?.trim() || null;
  if (typeof body.shippingMethod === "string") {
    data.shippingMethod = body.shippingMethod.trim() || order.shippingMethod;
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data,
  });

  if (body.fulfillmentStatus === "shipped" && order.fulfillmentStatus !== "shipped" && updated.customerEmail) {
    const studio = await prisma.studio.findUnique({ where: { id: studioId }, select: { displayName: true } });
    const customerHtml = orderShippedCopy({
      customerName: updated.customerName || "there",
      studioName: studio?.displayName ?? "Your studio",
      trackingCarrier: updated.trackingCarrier,
      trackingNumber: updated.trackingNumber,
      trackingUrl: updated.trackingUrl,
    });
    try {
      await sendOrderEmails({
        subject: "Your order is on the way",
        customerEmail: updated.customerEmail,
        customerHtml,
      });
    } catch {
      // Keep fulfillment update successful even if email transport fails.
    }
  }

  return NextResponse.json({ order: updated });
}
