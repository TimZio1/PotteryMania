import { NextResponse } from "next/server";
import type { Prisma, WearOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import {
  canWearOrderTransition,
  isWearOrderTerminal,
  validateWearOrderTransitionReason,
} from "@/lib/wear-order-lifecycle";
import { scheduleWearOrderNotification } from "@/lib/wear-order-notifications";
import { WEAR_EVENT_KINDS } from "@/lib/wear-event-kinds";
import { getStripe } from "@/lib/stripe";
import { submitPaidWearOrderToSpreadconnect } from "@/lib/wear-order-spreadconnect";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ orderId: string }> };

const STATUSES: WearOrderStatus[] = [
  "pending",
  "paid",
  "manual_review",
  "in_production",
  "fulfilled",
  "shipped",
  "cancelled",
  "refunded",
];

function isStatus(x: unknown): x is WearOrderStatus {
  return typeof x === "string" && STATUSES.includes(x as WearOrderStatus);
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { orderId } = await ctx.params;

  const o = await prisma.wearOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          wearProduct: { select: { id: true, slug: true, name: true } },
          wearProductVariant: { select: { id: true, label: true, sku: true } },
        },
      },
    },
  });
  if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    order: {
      id: o.id,
      status: o.status,
      customerEmail: o.customerEmail,
      customerName: o.customerName,
      subtotalCents: o.subtotalCents,
      amountTotalCents: o.amountTotalCents,
      currency: o.currency,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      fulfilledAt: o.fulfilledAt?.toISOString() ?? null,
      shippedAt: o.shippedAt?.toISOString() ?? null,
      cancelledAt: o.cancelledAt?.toISOString() ?? null,
      refundedAt: o.refundedAt?.toISOString() ?? null,
      fulfillmentProvider: o.fulfillmentProvider,
      trackingNumber: o.trackingNumber,
      internalNotes: o.internalNotes,
      externalFulfillmentRef: o.externalFulfillmentRef,
      stripeCheckoutSessionId: o.stripeCheckoutSessionId,
      stripePaymentIntentId: o.stripePaymentIntentId,
      items: o.items.map((it) => ({
        id: it.id,
        productNameSnapshot: it.productNameSnapshot,
        variantLabelSnapshot: it.variantLabelSnapshot,
        quantity: it.quantity,
        unitPriceCents: it.unitPriceCents,
        lineTotalCents: it.unitPriceCents * it.quantity,
        productId: it.wearProductId,
        productSlug: it.wearProduct.slug,
        variantId: it.wearProductVariantId,
        variantLabel: it.wearProductVariant?.label ?? null,
        variantSku: it.wearProductVariant?.sku ?? null,
      })),
    },
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { orderId } = await ctx.params;

  let body: {
    nextStatus?: unknown;
    reason?: unknown;
    confirmDestructive?: unknown;
    trackingNumber?: unknown;
    fulfillmentProvider?: unknown;
    internalNotes?: unknown;
    externalFulfillmentRef?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nextStatusRaw = body.nextStatus;
  const hasStatusChange = nextStatusRaw !== undefined && nextStatusRaw !== null;

  const trackingNumber =
    body.trackingNumber === null
      ? null
      : typeof body.trackingNumber === "string"
        ? body.trackingNumber.trim() || null
        : undefined;
  const fulfillmentProvider =
    body.fulfillmentProvider === null
      ? null
      : typeof body.fulfillmentProvider === "string"
        ? body.fulfillmentProvider.trim() || null
        : undefined;
  const internalNotes =
    body.internalNotes === null
      ? null
      : typeof body.internalNotes === "string"
        ? body.internalNotes
        : undefined;
  const externalFulfillmentRef =
    body.externalFulfillmentRef === null
      ? null
      : typeof body.externalFulfillmentRef === "string"
        ? body.externalFulfillmentRef.trim() || null
        : undefined;

  const reason = typeof body.reason === "string" ? body.reason : "";
  const confirmDestructive = body.confirmDestructive === true;

  const order = await prisma.wearOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (isWearOrderTerminal(order.status) && hasStatusChange) {
    return NextResponse.json({ error: "Order is closed; status cannot change." }, { status: 409 });
  }

  if (!hasStatusChange) {
    if (isWearOrderTerminal(order.status)) {
      return NextResponse.json({ error: "Order is closed; cannot edit fulfillment fields." }, { status: 409 });
    }
    const data: Prisma.WearOrderUpdateInput = {};
    if (trackingNumber !== undefined) data.trackingNumber = trackingNumber;
    if (fulfillmentProvider !== undefined) data.fulfillmentProvider = fulfillmentProvider;
    if (internalNotes !== undefined) data.internalNotes = internalNotes;
    if (externalFulfillmentRef !== undefined) data.externalFulfillmentRef = externalFulfillmentRef;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No updates provided." }, { status: 400 });
    }
    const updated = await prisma.wearOrder.update({ where: { id: orderId }, data });
    await logAdminAction({
      actorUserId: user.id,
      action: "wear_order.fulfillment_patch",
      entityType: "wear_order",
      entityId: orderId,
      before: {
        trackingNumber: order.trackingNumber,
        fulfillmentProvider: order.fulfillmentProvider,
        internalNotes: order.internalNotes,
        externalFulfillmentRef: order.externalFulfillmentRef,
      },
      after: {
        trackingNumber: updated.trackingNumber,
        fulfillmentProvider: updated.fulfillmentProvider,
        internalNotes: updated.internalNotes,
        externalFulfillmentRef: updated.externalFulfillmentRef,
      },
      reason: reason.trim() || null,
    });
    return NextResponse.json({ ok: true, orderId: updated.id, status: updated.status });
  }

  if (!isStatus(nextStatusRaw)) {
    return NextResponse.json({ error: "Invalid nextStatus." }, { status: 400 });
  }
  const nextStatus = nextStatusRaw;

  if (nextStatus === order.status) {
    return NextResponse.json({ error: "Already in that status." }, { status: 400 });
  }

  if (!canWearOrderTransition(order.status, nextStatus)) {
    return NextResponse.json(
      { error: `Cannot move from ${order.status} to ${nextStatus}.` },
      { status: 409 },
    );
  }

  const reasonErr = validateWearOrderTransitionReason(nextStatus, reason);
  if (reasonErr) return NextResponse.json({ error: reasonErr }, { status: 400 });

  if ((nextStatus === "cancelled" || nextStatus === "refunded") && !confirmDestructive) {
    return NextResponse.json(
      { error: "confirmDestructive must be true for cancelled or refunded." },
      { status: 400 },
    );
  }

  const now = new Date();
  const data: Prisma.WearOrderUpdateInput = { status: nextStatus };

  if (nextStatus === "paid") {
    data.paidAt = order.paidAt ?? now;
  }
  if (nextStatus === "fulfilled") {
    data.fulfilledAt = order.fulfilledAt ?? now;
  }
  if (nextStatus === "shipped") {
    data.shippedAt = order.shippedAt ?? now;
    if (trackingNumber !== undefined && trackingNumber !== null) {
      data.trackingNumber = trackingNumber;
    }
    if (fulfillmentProvider !== undefined && fulfillmentProvider !== null) {
      data.fulfillmentProvider = fulfillmentProvider;
    }
  }
  if (nextStatus === "cancelled") {
    data.cancelledAt = order.cancelledAt ?? now;
  }
  if (nextStatus === "refunded") {
    data.refundedAt = order.refundedAt ?? now;
  }

  if (internalNotes !== undefined) data.internalNotes = internalNotes;
  if (trackingNumber !== undefined && nextStatus !== "shipped") data.trackingNumber = trackingNumber;
  if (fulfillmentProvider !== undefined && nextStatus !== "shipped") data.fulfillmentProvider = fulfillmentProvider;
  if (externalFulfillmentRef !== undefined) data.externalFulfillmentRef = externalFulfillmentRef;

  let updated;
  if (nextStatus === "paid" && order.status === "pending") {
    updated = await prisma.$transaction(async (tx) => {
      const u = await tx.wearOrder.update({ where: { id: orderId }, data });
      for (const item of order.items) {
        if (!item.wearProductVariantId) continue;
        const v = await tx.wearProductVariant.findUnique({ where: { id: item.wearProductVariantId } });
        if (!v || v.stockQuantity == null) continue;
        await tx.wearProductVariant.update({
          where: { id: v.id },
          data: { stockQuantity: Math.max(0, v.stockQuantity - item.quantity) },
        });
      }
      await tx.wearAnalyticsEvent.create({
        data: {
          kind: WEAR_EVENT_KINDS.purchaseSuccess,
          orderId,
          payload: { source: "admin_mark_paid", actorUserId: user.id },
        },
      });
      return u;
    });
  } else {
    updated = await prisma.wearOrder.update({ where: { id: orderId }, data });
  }

  await logAdminAction({
    actorUserId: user.id,
    action: "wear_order.status",
    entityType: "wear_order",
    entityId: orderId,
    before: { status: order.status },
    after: { status: updated.status, paidAt: updated.paidAt, fulfilledAt: updated.fulfilledAt, shippedAt: updated.shippedAt },
    reason: reason.trim(),
  });

  if (nextStatus === "paid") {
    scheduleWearOrderNotification("order_confirmed", orderId, { manual: order.status === "pending" });
  } else if (nextStatus === "fulfilled") {
    scheduleWearOrderNotification("fulfilled", orderId);
  } else if (nextStatus === "shipped") {
    scheduleWearOrderNotification("shipped", orderId);
  } else   if (nextStatus === "refunded") {
    scheduleWearOrderNotification("refunded", orderId);
  }

  if (nextStatus === "paid" && order.status === "pending" && updated.stripeCheckoutSessionId) {
    try {
      const stripe = getStripe();
      const sess = await stripe.checkout.sessions.retrieve(updated.stripeCheckoutSessionId, {
        expand: ["shipping_cost.shipping_rate"],
      });
      await submitPaidWearOrderToSpreadconnect({ wearOrderId: orderId, stripeSession: sess });
    } catch (e) {
      logApiError("admin_wear_order_spreadconnect", e, { orderId }, req);
    }
  }

  return NextResponse.json({ ok: true, orderId: updated.id, status: updated.status });
}
