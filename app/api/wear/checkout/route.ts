import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { assertRateLimit } from "@/lib/rate-limit";
import {
  WEAR_CHECKOUT_SHIPPING_COUNTRIES,
  WEAR_FREE_SHIPPING_THRESHOLD_CENTS,
  WEAR_STANDARD_SHIPPING_CENTS,
} from "@/lib/wear-shipping";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";
import { logApiError } from "@/lib/monitoring";
import {
  MIN_DISCOUNTED_SUBTOTAL_CENTS,
  normalizeCouponCode,
  validateCouponState,
} from "@/lib/coupon-checkout";
import {
  mergeWearRequestLines,
  resolveWearCheckoutLines,
  wearStudioMarginTotals,
  wearStudioMarginWithCommissionOverride,
} from "@/lib/wear-checkout-lines";
import { buildWearEngineLinesFromResolved, computeWearCouponDiscount } from "@/lib/wear-discount-engine";
import { computeWearBuyXGetYDiscount } from "@/lib/wear-buy-x-get-y-campaign";
import type { Coupon, Prisma } from "@prisma/client";

function baseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "wear_checkout", 20, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many checkout attempts" }, { status: 429 });
  }

  let body: {
    items?: unknown[];
    customerEmail?: string;
    customerName?: string;
    studioId?: string;
    couponCode?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Identity is now collected by Stripe Checkout (email + shipping name) and
  // backfilled into `WearOrder.customerEmail` / `customerName` from the
  // `checkout.session.completed` webhook. We accept any value the client
  // happens to send (legacy clients) but never require it.
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : "";

  const merged = mergeWearRequestLines(Array.isArray(body.items) ? body.items : []);
  if (merged.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const requestingStudioId = typeof body.studioId === "string" ? body.studioId.trim() || null : null;
  const resolvedPack = await resolveWearCheckoutLines({ mergedLines: merged, requestingStudioId });
  if (!resolvedPack.ok) {
    return NextResponse.json({ error: resolvedPack.error }, { status: resolvedPack.status });
  }

  let coupon: Coupon | null = null;
  let couponDiscountCents = 0;
  const preDiscountSubtotalCents = resolvedPack.preDiscountSubtotalCents;
  const campaign = computeWearBuyXGetYDiscount(resolvedPack.resolved);
  const campaignDiscountCents = campaign.discountCents;
  const campaignAdjustedResolved = resolvedPack.resolved
    .map((r) => ({
      key: r.key,
      productId: r.productId,
      variantId: r.variantId,
      quantity: Math.max(0, r.quantity - (campaign.freeUnitsByKey[r.key] ?? 0)),
      unitCents: r.unitCents,
      baseCents: r.baseCents,
      supplyCostCents: r.supplyCostCents,
      product: r.product,
    }))
    .filter((r) => r.quantity > 0);
  const lineTotalAfterByKey: Record<string, number> = {};
  for (const r of resolvedPack.resolved) {
    lineTotalAfterByKey[r.key] = campaign.lineTotalAfterByKey[r.key] ?? r.unitCents * r.quantity;
  }

  const rawCoupon = typeof body.couponCode === "string" ? body.couponCode.trim() : "";
  if (rawCoupon.length > 0) {
    if (campaignAdjustedResolved.length === 0) {
      return NextResponse.json({ error: "This code doesn’t reduce this order." }, { status: 400 });
    }
    const code = normalizeCouponCode(rawCoupon);
    coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      return NextResponse.json({ error: "Unknown coupon code" }, { status: 400 });
    }
    const couponErr = validateCouponState(coupon, { surface: "wear" });
    if (couponErr) {
      return NextResponse.json({ error: couponErr }, { status: 400 });
    }

    const engineLines = buildWearEngineLinesFromResolved({
      resolved: campaignAdjustedResolved,
    });

    const disc = computeWearCouponDiscount({ coupon, lines: engineLines });
    if (!disc.ok) {
      return NextResponse.json({ error: disc.error }, { status: 400 });
    }
    couponDiscountCents = disc.discountCents;
    for (const r of campaignAdjustedResolved) {
      lineTotalAfterByKey[r.key] = disc.lineTotalAfterByKey[r.key] ?? lineTotalAfterByKey[r.key] ?? 0;
    }
  }
  const discountCents = couponDiscountCents + campaignDiscountCents;
  const subtotalCents = preDiscountSubtotalCents - discountCents;

  if (subtotalCents < MIN_DISCOUNTED_SUBTOTAL_CENTS) {
    return NextResponse.json(
      {
        error: `After discounts, merchandise must be at least €${(MIN_DISCOUNTED_SUBTOTAL_CENTS / 100).toFixed(2)}.`,
      },
      { status: 400 },
    );
  }

  let totalStudioMarginCents = 0;
  let platformRevenueCents = subtotalCents;

  if (resolvedPack.attributedStudioId && resolvedPack.studioMarginBps > 0) {
    const override = coupon?.affiliateCommissionBpsOverride;
    if (override != null && override > 0) {
      const m = wearStudioMarginWithCommissionOverride({
        subtotalAfterCents: subtotalCents,
        affiliateCommissionBpsOverride: override,
      });
      totalStudioMarginCents = m.totalStudioMarginCents;
      platformRevenueCents = m.platformRevenueCents;
    } else {
      const m = wearStudioMarginTotals({
        resolved: resolvedPack.resolved,
        attributedStudioId: resolvedPack.attributedStudioId,
        studioMarginBps: resolvedPack.studioMarginBps,
        lineTotalAfterByKey,
      });
      totalStudioMarginCents = m.totalStudioMarginCents;
      platformRevenueCents = m.platformRevenueCents;
    }
  }

  const currency = resolvedPack.currency;
  const qualifiesForFreeShipping = subtotalCents >= WEAR_FREE_SHIPPING_THRESHOLD_CENTS;
  const stripeLineTotalAfterByKey = { ...lineTotalAfterByKey };

  const orderId = await prisma.$transaction(async (tx) => {
    const order = await tx.wearOrder.create({
      data: {
        studioId: resolvedPack.attributedStudioId,
        couponId: coupon?.id ?? null,
        preDiscountSubtotalCents: discountCents > 0 ? preDiscountSubtotalCents : null,
        discountCents,
        customerEmail,
        customerName,
        status: "pending",
        subtotalCents,
        studioMarginCents: totalStudioMarginCents > 0 ? totalStudioMarginCents : null,
        platformRevenueCents: platformRevenueCents > 0 ? platformRevenueCents : null,
        currency: currency.toUpperCase(),
      },
    });
    for (const r of resolvedPack.resolved) {
      const after = lineTotalAfterByKey[r.key] ?? r.unitCents * r.quantity;
      const unitForStripe = Math.round(after / r.quantity);
      await tx.wearOrderItem.create({
        data: {
          orderId: order.id,
          wearProductId: r.productId,
          wearProductVariantId: r.variant?.id ?? null,
          quantity: r.quantity,
          unitPriceCents: unitForStripe,
          productNameSnapshot: r.lineName,
          variantLabelSnapshot: r.variant?.label ?? null,
        },
      });
    }
    return order.id;
  });

  const stripe = getStripe();
  const line_items = resolvedPack.resolved.flatMap((r) => {
    const freeQty = campaign.freeUnitsByKey[r.key] ?? 0;
    const paidQty = Math.max(0, r.quantity - freeQty);
    if (paidQty <= 0) return [];
    const imgs = wearImageUrlsFromJson(r.product.images as Prisma.JsonValue);
    const primary = imgs[0];
    const desc = [r.product.subtitle, r.variant?.label].filter(Boolean).join(" · ") || undefined;
    const after = stripeLineTotalAfterByKey[r.key] ?? r.unitCents * paidQty;
    const unitAmount = Math.round(after / paidQty);
    return [{
      quantity: paidQty,
      price_data: {
        currency,
        unit_amount: unitAmount,
        product_data: {
          name: r.lineName,
          ...(desc ? { description: desc } : {}),
          ...(primary ? { images: [primary] } : {}),
        },
      },
    }];
  });

  const metaCoupon: Record<string, string> =
    coupon && couponDiscountCents > 0
      ? {
          couponId: coupon.id,
          couponDiscountCents: String(couponDiscountCents),
          preDiscountSubtotalCents: String(preDiscountSubtotalCents),
        }
      : {};
  const metaCampaign: Record<string, string> =
    campaignDiscountCents > 0
      ? {
          campaign: "buy_4_get_1_free",
          campaignDiscountCents: String(campaignDiscountCents),
          campaignFreeItemCount: String(campaign.freeItemCount),
        }
      : {};

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // When `customer_email` is omitted, Stripe Checkout collects the email
      // itself and unlocks 1-tap autofill for returning Stripe Link users.
      // Apple Pay / Google Pay / Link / cards are auto-shown when the merchant
      // is configured in the Stripe Dashboard and we don't restrict
      // `payment_method_types`.
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      line_items,
      phone_number_collection: { enabled: true },
      billing_address_collection: "auto",
      success_url: `${baseUrl()}/wear/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl()}/wear/cart?cancelled=1`,
      shipping_address_collection: {
        allowed_countries: [...WEAR_CHECKOUT_SHIPPING_COUNTRIES],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: qualifiesForFreeShipping ? 0 : WEAR_STANDARD_SHIPPING_CENTS, currency },
            display_name: qualifiesForFreeShipping ? "Free shipping" : "Standard shipping",
          },
        },
      ],
      metadata: {
        type: "wear_order",
        wearOrderId: orderId,
        ...(resolvedPack.attributedStudioId ? { studioId: resolvedPack.attributedStudioId } : {}),
        ...metaCoupon,
        ...metaCampaign,
      },
      payment_intent_data: {
        metadata: {
          type: "wear_order",
          wearOrderId: orderId,
          ...(resolvedPack.attributedStudioId ? { studioId: resolvedPack.attributedStudioId } : {}),
          ...metaCoupon,
          ...metaCampaign,
        },
      },
    });

    await prisma.wearOrder.update({
      where: { id: orderId },
      data: { stripeCheckoutSessionId: session.id },
    });

    if (!session.url) {
      await prisma.wearOrder.delete({ where: { id: orderId } });
      return NextResponse.json({ error: "Checkout could not be started" }, { status: 502 });
    }

    return NextResponse.json({ url: session.url, orderId });
  } catch (e) {
    logApiError("wear_checkout", e, { orderId }, req);
    try {
      await prisma.wearOrder.delete({ where: { id: orderId } });
    } catch {
      /* best effort */
    }
    return NextResponse.json({ error: "Payment provider error" }, { status: 502 });
  }
}
