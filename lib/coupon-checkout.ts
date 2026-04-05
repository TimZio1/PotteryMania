import type { Coupon } from "@prisma/client";
import type Stripe from "stripe";
import { commissionCentsFromLine } from "@/lib/commission";
import type { CheckoutLineRow } from "@/lib/checkout-line-rows";

/** Stripe card minimum for many EU flows; keeps Checkout sessions valid. */
export const MIN_DISCOUNTED_SUBTOTAL_CENTS = 50;

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function validateCouponState(coupon: Coupon, now = new Date()): string | null {
  if (!coupon.isActive) return "Coupon is not active";
  if (coupon.validFrom && now < coupon.validFrom) return "Coupon is not valid yet";
  if (coupon.validUntil && now > coupon.validUntil) return "Coupon has expired";
  const pct = coupon.percentOff;
  const amt = coupon.amountOffCents;
  const hasPct = pct != null && pct > 0;
  const hasAmt = amt != null && amt > 0;
  if (!hasPct && !hasAmt) return "Coupon is misconfigured";
  if (hasPct && hasAmt) return "Coupon is misconfigured";
  if (coupon.maxRedemptions != null && coupon.redeemedCount >= coupon.maxRedemptions) {
    return "Coupon has reached its maximum redemptions";
  }
  return null;
}

export function computeCouponDiscountCents(coupon: Coupon, subtotalCents: number): number {
  let d = 0;
  if (coupon.percentOff != null && coupon.percentOff > 0) {
    d = Math.floor((subtotalCents * coupon.percentOff) / 100);
  } else if (coupon.amountOffCents != null && coupon.amountOffCents > 0) {
    d = coupon.amountOffCents;
  }
  return Math.min(Math.max(0, d), subtotalCents);
}

/** Largest-remainder allocation so line discounts sum exactly to discountCents. */
export function allocateDiscountAcrossLines(lineTotals: number[], discountCents: number): number[] {
  const n = lineTotals.length;
  if (n === 0 || discountCents <= 0) return lineTotals.map(() => 0);
  const total = lineTotals.reduce((a, b) => a + b, 0);
  if (total <= 0) return lineTotals.map(() => 0);

  const exact = lineTotals.map((t) => (discountCents * t) / total);
  const floor = exact.map((e) => Math.floor(e));
  const rem = discountCents - floor.reduce((a, b) => a + b, 0);
  const order = exact
    .map((e, i) => ({ i, r: e - Math.floor(e) }))
    .sort((a, b) => b.r - a.r);
  const out = [...floor];
  for (let k = 0; k < rem; k++) {
    out[order[k].i] += 1;
  }
  return out;
}

export function capDiscountForMinimumLineRemainder(
  lineTotals: number[],
  requestedDiscountCents: number,
  minRemainderPerLineCents: number,
): { discountCents: number; error: string | null } {
  const n = lineTotals.length;
  if (n === 0) return { discountCents: 0, error: null };
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);
  const maxDiscount = subtotal - n * minRemainderPerLineCents;
  if (maxDiscount < 0) {
    return { discountCents: 0, error: "Cart lines are too small to apply a coupon" };
  }
  const discountCents = Math.min(requestedDiscountCents, maxDiscount);
  return { discountCents, error: null };
}

export function applyCouponToLineRows(
  rows: CheckoutLineRow[],
  productBps: number,
  bookingBps: number,
  discountCents: number,
): CheckoutLineRow[] {
  if (discountCents <= 0) return rows;
  const totals = rows.map((r) => r.chargedLineCents);
  const alloc = allocateDiscountAcrossLines(totals, discountCents);
  return rows.map((row, i) => {
    const newCharged = row.chargedLineCents - alloc[i];
    const bps = row.itemType === "product" ? productBps : bookingBps;
    const com = commissionCentsFromLine(newCharged, bps);
    return {
      ...row,
      chargedLineCents: newCharged,
      commissionCents: com,
      vendorCents: newCharged - com,
    };
  });
}

export function lineRowsToStripeLineItems(
  rows: CheckoutLineRow[],
  flattenForCoupon: boolean,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  if (!flattenForCoupon) {
    return rows.map((r) => ({
      quantity: r.stripeQuantity,
      price_data: {
        currency: "eur",
        unit_amount: r.stripeUnitCents,
        product_data: { name: r.stripeName },
      },
    }));
  }

  return rows.map((r) => {
    let name = r.stripeName;
    if (r.itemType === "product" && r.quantity > 1) {
      name = `${r.title} × ${r.quantity}`;
    }
    return {
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: r.chargedLineCents,
        product_data: { name },
      },
    };
  });
}

export function recomputeTotalsFromLineRows(rows: CheckoutLineRow[]): {
  subtotal: number;
  commissionTotal: number;
} {
  let subtotal = 0;
  let commissionTotal = 0;
  for (const r of rows) {
    subtotal += r.chargedLineCents;
    commissionTotal += r.commissionCents;
  }
  return { subtotal, commissionTotal };
}
