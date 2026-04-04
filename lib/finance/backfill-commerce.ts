import type { Order } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ACTIVATION_FEE_CENTS, LEDGER_SOURCE_SYSTEM } from "./constants";
import { upsertLedgerEntry } from "./ledger";

function isMonetizedOrder(order: Pick<Order, "orderStatus" | "paymentStatus">): boolean {
  return (
    order.paymentStatus === "paid" ||
    ["paid", "processing", "fulfilled", "refunded", "partially_refunded"].includes(order.orderStatus)
  );
}

function orderCountry(order: Pick<Order, "shippingAddressJson">): string | null {
  const j = order.shippingAddressJson;
  if (!j || typeof j !== "object" || j === null) return null;
  const c = (j as Record<string, unknown>).country;
  return typeof c === "string" ? c : null;
}

function entryDateFromOrder(order: Pick<Order, "createdAt" | "updatedAt">): Date {
  return new Date(order.createdAt.toISOString().slice(0, 10));
}

/**
 * Writes ledger rows for paid commerce: GMV, platform commission, vendor pass-through, refunds.
 */
export async function backfillOrdersToLedger(limit = 500): Promise<{ processed: number }> {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { paymentStatus: "paid" },
        { orderStatus: { in: ["paid", "processing", "fulfilled", "refunded", "partially_refunded"] } },
      ],
    },
    include: { items: true, payments: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let processed = 0;
  for (const order of orders) {
    if (!isMonetizedOrder(order)) continue;
    processed += 1;
    const day = entryDateFromOrder(order);
    const country = orderCountry(order);

    await upsertLedgerEntry({
      dedupeKey: `order:${order.id}:gross_revenue`,
      entryDate: day,
      entryType: "gross_revenue",
      amountCents: order.totalCents,
      direction: "credit",
      sourceSystem: LEDGER_SOURCE_SYSTEM.commerce,
      sourceType: "order",
      sourceId: order.id,
      userId: order.customerUserId,
      orderId: order.id,
      country,
      notes: "Customer GMV (checkout total)",
      metadata: { orderStatus: order.orderStatus, paymentStatus: order.paymentStatus },
    });

    const commissionSum = order.items.reduce((s, i) => s + i.commissionSnapshotCents, 0);
    const vendorSum = order.items.reduce((s, i) => s + i.vendorAmountSnapshotCents, 0);

    if (commissionSum > 0) {
      await upsertLedgerEntry({
        dedupeKey: `order:${order.id}:platform_commission`,
        entryDate: day,
        entryType: "platform_commission",
        amountCents: commissionSum,
        direction: "credit",
        sourceSystem: LEDGER_SOURCE_SYSTEM.commerce,
        sourceType: "order",
        sourceId: order.id,
        userId: order.customerUserId,
        orderId: order.id,
        country,
        notes: "Platform take (application fee snapshot)",
      });
    }

    if (vendorSum > 0) {
      await upsertLedgerEntry({
        dedupeKey: `order:${order.id}:vendor_payout`,
        entryDate: day,
        entryType: "vendor_payout",
        amountCents: vendorSum,
        direction: "debit",
        sourceSystem: LEDGER_SOURCE_SYSTEM.commerce,
        sourceType: "order",
        sourceId: order.id,
        userId: order.customerUserId,
        orderId: order.id,
        country,
        notes: "Vendor share (pass-through, not platform COGS)",
      });
    }

    const isRefunded =
      order.orderStatus === "refunded" ||
      order.orderStatus === "partially_refunded" ||
      order.paymentStatus === "refunded" ||
      order.paymentStatus === "partially_refunded";

    if (isRefunded && order.totalCents > 0) {
      await upsertLedgerEntry({
        dedupeKey: `order:${order.id}:refund_proxy`,
        entryDate: day,
        entryType: "refund",
        amountCents: order.totalCents,
        direction: "debit",
        sourceSystem: LEDGER_SOURCE_SYSTEM.commerce,
        sourceType: "order",
        sourceId: order.id,
        userId: order.customerUserId,
        orderId: order.id,
        country,
        notes: "Refund proxy from order total (reconcile with Stripe for exact fees)",
      });
    }
  }

  return { processed };
}

/**
 * One row per activated studio that paid €5 (not promo-free).
 */
export async function backfillStudioActivationsToLedger(limit = 500): Promise<{ processed: number }> {
  const studios = await prisma.studio.findMany({
    where: {
      activationPaidAt: { not: null },
      NOT: { activationSessionId: "promo_free" },
    },
    select: { id: true, ownerUserId: true, country: true, activationPaidAt: true },
    take: limit,
    orderBy: { activationPaidAt: "asc" },
  });

  let processed = 0;
  for (const s of studios) {
    processed += 1;
    const day = s.activationPaidAt
      ? new Date(s.activationPaidAt.toISOString().slice(0, 10))
      : new Date();
    await upsertLedgerEntry({
      dedupeKey: `studio_activation:${s.id}`,
      entryDate: day,
      entryType: "activation_fee",
      amountCents: ACTIVATION_FEE_CENTS,
      direction: "credit",
      sourceSystem: LEDGER_SOURCE_SYSTEM.commerce,
      sourceType: "studio",
      sourceId: s.id,
      userId: s.ownerUserId,
      studioId: s.id,
      country: s.country,
      notes: "Studio activation fee",
    });
  }

  return { processed };
}

