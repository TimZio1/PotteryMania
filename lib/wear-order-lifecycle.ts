import type { WearOrderStatus } from "@prisma/client";

/** Payment captured — counts as revenue / analytics “paid order”. */
export const WEAR_ORDER_PAID_LIKE: readonly WearOrderStatus[] = [
  "paid",
  "in_production",
  "fulfilled",
  "shipped",
] as const;

export function isWearOrderPaidLike(status: WearOrderStatus): boolean {
  return (WEAR_ORDER_PAID_LIKE as readonly string[]).includes(status);
}

export function isWearOrderTerminal(status: WearOrderStatus): boolean {
  return status === "cancelled" || status === "refunded";
}

/** Checkout session exists (payment may still be pending). */
export function isWearCheckoutSessionStatus(status: WearOrderStatus): boolean {
  return status === "pending" || isWearOrderPaidLike(status);
}

export function allowedWearOrderTransitions(from: WearOrderStatus): WearOrderStatus[] {
  switch (from) {
    case "pending":
      return ["paid", "cancelled"];
    case "paid":
      return ["in_production", "fulfilled", "cancelled", "refunded"];
    case "in_production":
      return ["fulfilled", "cancelled", "refunded"];
    case "fulfilled":
      return ["shipped", "cancelled", "refunded"];
    case "shipped":
      return ["refunded"];
    case "cancelled":
    case "refunded":
      return [];
    default:
      return [];
  }
}

export function canWearOrderTransition(from: WearOrderStatus, to: WearOrderStatus): boolean {
  return allowedWearOrderTransitions(from).includes(to);
}

export function wearOrderNeedsOpsAttention(status: WearOrderStatus): boolean {
  return status === "pending" || status === "paid" || status === "in_production" || status === "fulfilled";
}

const REASON_MIN = 8;

export function validateWearOrderTransitionReason(
  next: WearOrderStatus,
  reason: string | undefined,
): string | null {
  const needsReason =
    next === "cancelled" || next === "refunded" || next === "paid";
  if (!needsReason) return null;
  const t = (reason ?? "").trim();
  if (t.length < REASON_MIN) {
    return `Reason is required (at least ${REASON_MIN} characters) for this action.`;
  }
  return null;
}
