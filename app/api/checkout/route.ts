import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { getCartForRequest, cartItemInclude } from "@/lib/cart-server";
import { getStripe } from "@/lib/stripe";
import { assertRateLimit } from "@/lib/rate-limit";
import { isRuntimeFlagEnabled, RUNTIME_FLAG_KEYS } from "@/lib/runtime-feature-flags";
import { calculateEstimatedTaxCents, stripeTaxEnabled } from "@/lib/tax";
import { buildCheckoutLineRowsFromCart } from "@/lib/checkout-line-rows";
import {
  applyCouponToLineRows,
  capDiscountForMinimumLineRemainder,
  computeCouponDiscountCents,
  lineRowsToStripeLineItems,
  MIN_DISCOUNTED_SUBTOTAL_CENTS,
  normalizeCouponCode,
  recomputeTotalsFromLineRows,
  validateCouponState,
} from "@/lib/coupon-checkout";
import {
  attachGiftCardReservationsToSession,
  applyGiftCardToLineRows,
  previewGiftCardRedemption,
  releaseGiftCardRedemptionsForOrder,
} from "@/lib/gift-cards/checkout";
import { logApiError } from "@/lib/monitoring";
import { runCheckoutCompletionSideEffects, settleCheckoutOrderPayment } from "@/lib/orders/checkout-completion";
import { studioCanOperateMessage } from "@/lib/studio-operating-gates";
import { resolveShippingZoneForDestination, zonePriceCents } from "@/lib/shipping-zones";
import { createPendingCheckoutOrder } from "@/lib/checkout/checkout-order-creation";
function baseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "checkout", 20, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many checkout attempts" }, { status: 429 });
  }
  const user = await getSessionUser();
  const { cartId } = await getCartForRequest(user?.id ?? null);

  let body: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    shippingAddress?: { line1?: string; line2?: string; city?: string; country?: string; postal?: string };
    billingAddress?: Record<string, unknown>;
    notes?: string;
    couponCode?: string;
    giftCardCode?: string;
    /** Required when the cart contains items from multiple studios (separate Stripe Connect checkouts). */
    studioId?: string;
  };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("checkout_invalid_json", e, undefined, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : "";
  if (!customerName || !customerEmail) {
    return NextResponse.json({ error: "customerName and customerEmail required" }, { status: 400 });
  }

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: { include: cartItemInclude } },
  });
  if (!cart?.items.length) {
    return NextResponse.json({ error: "Cart empty" }, { status: 400 });
  }

  const scopeStudio = typeof body.studioId === "string" ? body.studioId.trim() : undefined;
  const built = await buildCheckoutLineRowsFromCart(cart, scopeStudio ? { studioId: scopeStudio } : undefined);
  if (!built.ok) {
    if (built.status === 409 && "multiVendorStudios" in built) {
      return NextResponse.json(
        { error: built.error, multiVendorStudios: built.multiVendorStudios },
        { status: 409 },
      );
    }
    if (built.status === 409 && "priceChanged" in built && built.priceChanged) {
      return NextResponse.json({ error: built.error, priceChanged: true }, { status: 409 });
    }
    return NextResponse.json({ error: built.error }, { status: built.status });
  }

  let { lineRows, subtotal } = built;
  const { studioId, productBps, bookingBps } = built;

  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.status !== "approved") {
    return NextResponse.json({ error: "Studio not available" }, { status: 400 });
  }

  const stripeRow = await prisma.stripeAccount.findUnique({ where: { studioId } });
  if (!stripeRow?.chargesEnabled || !stripeRow.payoutsEnabled) {
    return NextResponse.json({ error: studioCanOperateMessage() }, { status: 400 });
  }

  let couponIdForMeta: string | null = null;
  let couponCodeForMeta: string | null = null;
  let discountAppliedCents = 0;
  let giftCardForMeta: { id: string; code: string; name: string } | null = null;
  let giftCardAppliedCents = 0;

  const rawCoupon = typeof body.couponCode === "string" ? body.couponCode.trim() : "";
  if (rawCoupon.length > 0) {
    const code = normalizeCouponCode(rawCoupon);
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      return NextResponse.json({ error: "Unknown coupon code" }, { status: 400 });
    }
    const couponErr = validateCouponState(coupon, {
      studioId,
      subtotalCents: subtotal,
    });
    if (couponErr) {
      return NextResponse.json({ error: couponErr }, { status: 400 });
    }
    if (coupon.maxPerCustomer != null && user?.id) {
      const redeemed = await prisma.discountRedemption.count({
        where: { couponId: coupon.id, userId: user.id },
      });
      if (redeemed >= coupon.maxPerCustomer) {
        return NextResponse.json({ error: "Coupon usage limit reached for this account" }, { status: 400 });
      }
    }
    const cur = coupon.currency?.toUpperCase() ?? "EUR";
    if (cur !== "EUR") {
      return NextResponse.json({ error: "Coupon currency is not supported for this checkout" }, { status: 400 });
    }
    let disc = computeCouponDiscountCents(coupon, subtotal);
    const lineTotals = lineRows.map((r) => r.chargedLineCents);
    const capped = capDiscountForMinimumLineRemainder(lineTotals, disc, 1);
    if (capped.error) {
      return NextResponse.json({ error: capped.error }, { status: 400 });
    }
    disc = capped.discountCents;
    if (disc <= 0) {
      return NextResponse.json({ error: "This coupon does not reduce this order" }, { status: 400 });
    }
    lineRows = applyCouponToLineRows(lineRows, productBps, bookingBps, disc);
    ({ subtotal } = recomputeTotalsFromLineRows(lineRows));
    couponIdForMeta = coupon.id;
    couponCodeForMeta = coupon.code;
    discountAppliedCents = disc;
    if (subtotal < MIN_DISCOUNTED_SUBTOTAL_CENTS) {
      return NextResponse.json(
        {
          error: `After the coupon, the order subtotal must be at least €${(MIN_DISCOUNTED_SUBTOTAL_CENTS / 100).toFixed(2)}`,
        },
        { status: 400 },
      );
    }
  }

  const rawGiftCard = typeof body.giftCardCode === "string" ? body.giftCardCode.trim() : "";
  if (rawGiftCard.length > 0) {
    const giftCardPreview = await previewGiftCardRedemption(prisma, rawGiftCard, subtotal, {
      studioId,
    });
    if (!giftCardPreview.ok) {
      return NextResponse.json({ error: giftCardPreview.error }, { status: giftCardPreview.status });
    }
    giftCardAppliedCents = giftCardPreview.preview.appliedCents;
    giftCardForMeta = {
      id: giftCardPreview.preview.giftCard.id,
      code: giftCardPreview.preview.giftCard.code,
      name: giftCardPreview.preview.giftCard.name,
    };
  }

  const hasBookingsInCart = lineRows.some((row) => row.itemType === "booking");
  const hasProductsInCart = lineRows.some((row) => row.itemType === "product");
  if (hasBookingsInCart && !(await isRuntimeFlagEnabled(RUNTIME_FLAG_KEYS.bookingCheckoutEnabled))) {
    return NextResponse.json(
      { error: "Class booking checkout is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
  if (hasProductsInCart && !(await isRuntimeFlagEnabled(RUNTIME_FLAG_KEYS.marketplaceCheckoutEnabled))) {
    return NextResponse.json(
      { error: "Shop checkout is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const shipping = body.shippingAddress || {};
  const shippingAddressJson = {
    line1: shipping.line1 || "",
    line2: shipping.line2 || "",
    city: shipping.city || "",
    country: shipping.country || "",
    postal: shipping.postal || "",
  };
  const hasProducts = lineRows.some((row) => row.itemType === "product");
  if (hasProducts && !shippingAddressJson.country.trim()) {
    return NextResponse.json({ error: "shippingAddress.country is required for shippable products." }, { status: 400 });
  }
  let shippingQuote: { shippingCents: number; methodLabel: string } = { shippingCents: 0, methodLabel: "No shipping required" };
  if (hasProducts) {
    const zone = resolveShippingZoneForDestination({
      destinationCountry: shippingAddressJson.country,
      studioCountry: studio.country,
    });
    const productIds = [...new Set(lineRows.filter((r) => r.itemType === "product" && r.productId).map((r) => r.productId!))];
    const productRows = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        title: true,
        shippingDomesticCents: true,
        shippingEuropeCents: true,
        shippingUsaCents: true,
        shippingCanadaCents: true,
        shippingAsiaCents: true,
      },
    });
    const byId = new Map(productRows.map((p) => [p.id, p] as const));
    let shippingCents = 0;
    for (const row of lineRows) {
      if (row.itemType !== "product" || !row.productId) continue;
      const p = byId.get(row.productId);
      if (!p) return NextResponse.json({ error: "A cart product is no longer available." }, { status: 409 });
      const zonePrice = zonePriceCents(p, zone);
      if (zonePrice == null) {
        return NextResponse.json(
          { error: `Product "${p.title}" is not available for shipping to your region.` },
          { status: 409 },
        );
      }
      shippingCents += zonePrice * Math.max(1, row.quantity);
    }
    shippingQuote = { shippingCents, methodLabel: `Studio-defined ${zone} shipping` };
  }
  const estimatedTaxCents = hasProducts
    ? calculateEstimatedTaxCents({
        subtotalCents: subtotal,
        shippingCents: shippingQuote.shippingCents,
        destinationCountry: shippingAddressJson.country,
      })
    : 0;
  const stripeChargeTotal = Math.max(0, subtotal - giftCardAppliedCents) + shippingQuote.shippingCents + estimatedTaxCents;
  const grandTotal = subtotal + shippingQuote.shippingCents + estimatedTaxCents;

  let order;
  try {
    order = await createPendingCheckoutOrder({
      prisma,
      lineRows,
      studioId,
      customer: {
        userId: user?.id ?? null,
        name: customerName,
        email: customerEmail,
        phone: body.customerPhone?.trim() || null,
      },
      orderMeta: {
        shippingAddressJson,
        billingAddress: body.billingAddress,
        notes: body.notes?.trim() || null,
        hasProducts,
        shippingMethod: shippingQuote.methodLabel,
        shippingCents: shippingQuote.shippingCents,
        taxCents: estimatedTaxCents,
        subtotalCents: subtotal,
        totalCents: grandTotal,
      },
      couponIdForMeta,
      giftCardForMeta: giftCardForMeta ? { id: giftCardForMeta.id } : null,
      giftCardAppliedCents,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "COUPON_EXHAUSTED") {
      return NextResponse.json(
        { error: "This coupon has reached its maximum redemptions." },
        { status: 409 },
      );
    }
    if (e instanceof Error && e.message === "GIFT_CARD_BALANCE_CONFLICT") {
      return NextResponse.json(
        { error: "This gift card balance changed. Please review and try again." },
        { status: 409 },
      );
    }
    throw e;
  }

  const checkoutCartItemIds = lineRows.map((r) => r.cartItemId).join(",");
  const checkoutCartItemIdsList = checkoutCartItemIds
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (stripeChargeTotal <= 0) {
    try {
      const processed = await prisma.$transaction((tx) =>
        settleCheckoutOrderPayment(tx, {
          orderId: order.id,
          currency: "EUR",
          giftCardAmountCents: giftCardAppliedCents,
          couponRedemption:
            couponIdForMeta && discountAppliedCents > 0
              ? { couponId: couponIdForMeta, amountCents: discountAppliedCents }
              : null,
          cartId,
          checkoutCartItemIds: checkoutCartItemIdsList,
        }),
      );
      if (!processed.skip) {
        await runCheckoutCompletionSideEffects({
          orderId: order.id,
          confirmedBookingIds: processed.confirmedBookingIds,
          pendingApprovalIds: processed.pendingApprovalIds,
          autoCancelledIds: processed.autoCancelledIds,
          stockFailureCancelled: processed.stockFailureCancelled,
        });
      }
      return NextResponse.json({
        url: `${baseUrl()}/checkout/success?orderId=${encodeURIComponent(order.id)}`,
        orderId: order.id,
        totals: {
          subtotal,
          discount: discountAppliedCents + giftCardAppliedCents,
          shipping: shippingQuote.shippingCents,
          tax: estimatedTaxCents,
          total: stripeChargeTotal,
        },
      });
    } catch (error) {
      await releaseGiftCardRedemptionsForOrder(prisma, { orderId: order.id });
      throw error;
    }
  }

  const stripe = getStripe();
  const useFlattenedStripe = discountAppliedCents > 0 || giftCardAppliedCents > 0;
  const stripeLineRows =
    giftCardAppliedCents > 0
      ? applyGiftCardToLineRows(lineRows, productBps, bookingBps, Math.min(giftCardAppliedCents, subtotal))
      : lineRows;
  const stripeTotals = recomputeTotalsFromLineRows(stripeLineRows);
  const line_items = lineRowsToStripeLineItems(stripeLineRows, useFlattenedStripe);
  if (shippingQuote.shippingCents > 0) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: shippingQuote.shippingCents,
        product_data: {
          name: shippingQuote.methodLabel,
        },
      },
    });
  }
  if (!stripeTaxEnabled() && estimatedTaxCents > 0) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: estimatedTaxCents,
        product_data: {
          name: "Estimated tax",
        },
      },
    });
  }

  const sessionMetadata: Record<string, string> = {
    orderId: order.id,
    cartId,
    checkoutCartItemIds,
  };
  if (couponIdForMeta && discountAppliedCents > 0) {
    sessionMetadata.couponId = couponIdForMeta;
    sessionMetadata.discountCents = String(discountAppliedCents);
    if (couponCodeForMeta) sessionMetadata.couponCode = couponCodeForMeta;
  }
  if (giftCardForMeta && giftCardAppliedCents > 0) {
    sessionMetadata.giftCardId = giftCardForMeta.id;
    sessionMetadata.giftCardCode = giftCardForMeta.code;
    sessionMetadata.giftCardAppliedCents = String(giftCardAppliedCents);
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: customerEmail,
        line_items,
        success_url: `${baseUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl()}/cart?cancelled=1`,
        automatic_tax: stripeTaxEnabled() ? { enabled: true } : undefined,
        payment_intent_data: {
          ...(stripeTotals.commissionTotal > 0 ? { application_fee_amount: stripeTotals.commissionTotal } : {}),
          metadata: {
            orderId: order.id,
            ...(couponIdForMeta ? { couponId: couponIdForMeta, discountCents: String(discountAppliedCents) } : {}),
            ...(giftCardForMeta ? { giftCardId: giftCardForMeta.id, giftCardAppliedCents: String(giftCardAppliedCents) } : {}),
          },
        },
        metadata: sessionMetadata,
      },
      { stripeAccount: stripeRow.stripeAccountId },
    );

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { stripeCheckoutSessionId: session.id },
      });
      if (giftCardForMeta && giftCardAppliedCents > 0) {
        await attachGiftCardReservationsToSession(tx, {
          orderId: order.id,
          stripeCheckoutSessionId: session.id,
        });
      }
    });
  } catch (error) {
    await releaseGiftCardRedemptionsForOrder(prisma, { orderId: order.id });
    throw error;
  }

  return NextResponse.json({
    url: session.url,
    orderId: order.id,
    totals: {
      subtotal,
      discount: discountAppliedCents + giftCardAppliedCents,
      shipping: shippingQuote.shippingCents,
      tax: estimatedTaxCents,
      total: stripeChargeTotal,
    },
  });
}
