import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { getCartForRequest, cartItemInclude } from "@/lib/cart-server";
import { getStripe } from "@/lib/stripe";
import { allocateTicketRef } from "@/lib/bookings/ticket-ref";
import { assertRateLimit } from "@/lib/rate-limit";
import { isRuntimeFlagEnabled, RUNTIME_FLAG_KEYS } from "@/lib/runtime-feature-flags";
import { calculateShippingRate } from "@/lib/shipping";
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
  };
  try {
    body = await req.json();
  } catch {
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

  const built = await buildCheckoutLineRowsFromCart(cart);
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: built.status });
  }

  let { lineRows, subtotal, commissionTotal } = built;
  const { totalWeightGrams, studioId, productBps, bookingBps } = built;

  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio?.activationPaidAt) {
    return NextResponse.json({ error: "Studio has not been activated" }, { status: 400 });
  }

  const stripeRow = await prisma.stripeAccount.findUnique({ where: { studioId } });
  if (!stripeRow?.chargesEnabled || !stripeRow.payoutsEnabled) {
    return NextResponse.json({ error: "Studio has not completed Stripe Connect" }, { status: 400 });
  }

  let couponIdForMeta: string | null = null;
  let couponCodeForMeta: string | null = null;
  let discountAppliedCents = 0;

  const rawCoupon = typeof body.couponCode === "string" ? body.couponCode.trim() : "";
  if (rawCoupon.length > 0) {
    const code = normalizeCouponCode(rawCoupon);
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      return NextResponse.json({ error: "Unknown coupon code" }, { status: 400 });
    }
    const couponErr = validateCouponState(coupon);
    if (couponErr) {
      return NextResponse.json({ error: couponErr }, { status: 400 });
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
    ({ subtotal, commissionTotal } = recomputeTotalsFromLineRows(lineRows));
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
      { error: "Marketplace checkout is temporarily unavailable. Please try again later." },
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
  const shippingQuote = hasProducts
    ? calculateShippingRate({
        subtotalCents: subtotal,
        destinationCountry: shippingAddressJson.country,
        totalWeightGrams,
      })
    : { shippingCents: 0, methodLabel: "No shipping required" };
  const estimatedTaxCents = hasProducts
    ? calculateEstimatedTaxCents({
        subtotalCents: subtotal,
        shippingCents: shippingQuote.shippingCents,
        destinationCountry: shippingAddressJson.country,
      })
    : 0;
  const grandTotal = subtotal + shippingQuote.shippingCents + estimatedTaxCents;

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        customerUserId: user?.id ?? null,
        customerName,
        customerEmail,
        customerPhone: body.customerPhone?.trim() || null,
        shippingAddressJson,
        billingAddressJson: body.billingAddress ? (body.billingAddress as object) : undefined,
        notes: body.notes?.trim() || null,
        orderStatus: "pending",
        paymentStatus: "pending",
        fulfillmentStatus: hasProducts ? "pending" : "processing",
        shippingMethod: shippingQuote.methodLabel,
        shippingRateCents: shippingQuote.shippingCents,
        taxCents: estimatedTaxCents,
        subtotalCents: subtotal,
        totalCents: grandTotal,
        currency: "EUR",
      },
    });

    for (const row of lineRows) {
      if (row.itemType === "product" && row.productId) {
        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            itemType: "product",
            productId: row.productId,
            vendorId: studioId,
            quantity: row.quantity,
            priceSnapshotCents: row.chargedLineCents,
            commissionSnapshotCents: row.commissionCents,
            vendorAmountSnapshotCents: row.vendorCents,
          },
        });
        continue;
      }

      if (row.itemType === "booking" && row.experienceId && row.slotId && row.participantCount) {
        const ticketRef = await allocateTicketRef(tx);
        const booking = await tx.booking.create({
          data: {
            studioId,
            experienceId: row.experienceId,
            slotId: row.slotId,
            customerUserId: user?.id ?? null,
            customerName,
            customerEmail,
            customerPhone: body.customerPhone?.trim() || null,
            participantCount: row.participantCount,
            seatType: row.seatType ?? null,
            ticketRef,
            bookingStatus: "pending",
            paymentStatus: "pending",
            totalAmountCents: row.fullLineCents,
            depositAmountCents: row.chargedLineCents,
            remainingBalanceCents: row.fullLineCents - row.chargedLineCents,
            commissionAmountCents: row.commissionCents,
            vendorAmountCents: row.vendorCents,
            cancellationPolicySnapshot: row.policySnapshot,
            notes: body.notes?.trim() || null,
          },
        });

        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            itemType: "booking",
            bookingId: booking.id,
            vendorId: studioId,
            quantity: 1,
            participantCount: row.participantCount,
            priceSnapshotCents: row.chargedLineCents,
            commissionSnapshotCents: row.commissionCents,
            vendorAmountSnapshotCents: row.vendorCents,
          },
        });
      }
    }

    if (hasProducts) {
      await tx.shippingRateQuote.create({
        data: {
          orderId: createdOrder.id,
          studioId,
          destinationCountry: shippingAddressJson.country || "GR",
          destinationCity: shippingAddressJson.city || null,
          subtotalCents: subtotal,
          shippingCents: shippingQuote.shippingCents,
          methodLabel: shippingQuote.methodLabel,
        },
      });
    }

    return createdOrder;
  });

  const stripe = getStripe();
  const useFlattenedStripe = discountAppliedCents > 0;
  const line_items = lineRowsToStripeLineItems(lineRows, useFlattenedStripe);

  const sessionMetadata: Record<string, string> = {
    orderId: order.id,
    cartId,
  };
  if (couponIdForMeta && discountAppliedCents > 0) {
    sessionMetadata.couponId = couponIdForMeta;
    sessionMetadata.discountCents = String(discountAppliedCents);
    if (couponCodeForMeta) sessionMetadata.couponCode = couponCodeForMeta;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    line_items,
    success_url: `${baseUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl()}/cart?cancelled=1`,
    automatic_tax: stripeTaxEnabled() ? { enabled: true } : undefined,
    payment_intent_data: {
      application_fee_amount: commissionTotal,
      transfer_data: { destination: stripeRow.stripeAccountId },
      metadata: {
        orderId: order.id,
        ...(couponIdForMeta ? { couponId: couponIdForMeta, discountCents: String(discountAppliedCents) } : {}),
      },
    },
    metadata: sessionMetadata,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return NextResponse.json({
    url: session.url,
    orderId: order.id,
    totals: {
      subtotal,
      discount: discountAppliedCents,
      shipping: shippingQuote.shippingCents,
      tax: estimatedTaxCents,
      total: grandTotal,
    },
  });
}
