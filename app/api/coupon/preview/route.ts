import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { getCartForRequest, cartItemInclude } from "@/lib/cart-server";
import { buildCheckoutLineRowsFromCart } from "@/lib/checkout-line-rows";
import {
  applyCouponToLineRows,
  capDiscountForMinimumLineRemainder,
  computeCouponDiscountCents,
  MIN_DISCOUNTED_SUBTOTAL_CENTS,
  normalizeCouponCode,
  recomputeTotalsFromLineRows,
  validateCouponState,
} from "@/lib/coupon-checkout";
import { calculateShippingRate } from "@/lib/shipping";
import { calculateEstimatedTaxCents } from "@/lib/tax";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  const { cartId } = await getCartForRequest(user?.id ?? null);

  let body: { code?: string; shippingAddress?: { line1?: string; city?: string; country?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof body.code === "string" ? body.code.trim() : "";
  if (!raw) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
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

  const subtotalBefore = built.subtotal;
  const code = normalizeCouponCode(raw);
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
    return NextResponse.json({ error: "Coupon currency is not supported" }, { status: 400 });
  }

  let disc = computeCouponDiscountCents(coupon, subtotalBefore);
  const lineTotals = built.lineRows.map((r) => r.chargedLineCents);
  const capped = capDiscountForMinimumLineRemainder(lineTotals, disc, 1);
  if (capped.error) {
    return NextResponse.json({ error: capped.error }, { status: 400 });
  }
  disc = capped.discountCents;
  if (disc <= 0) {
    return NextResponse.json({ error: "This coupon does not reduce this order" }, { status: 400 });
  }

  const adjusted = applyCouponToLineRows(built.lineRows, built.productBps, built.bookingBps, disc);
  const { subtotal: subtotalAfter } = recomputeTotalsFromLineRows(adjusted);
  if (subtotalAfter < MIN_DISCOUNTED_SUBTOTAL_CENTS) {
    return NextResponse.json(
      {
        error: `After the coupon, the order subtotal must be at least €${(MIN_DISCOUNTED_SUBTOTAL_CENTS / 100).toFixed(2)}`,
      },
      { status: 400 },
    );
  }

  const shipping = body.shippingAddress || {};
  const shippingAddressJson = {
    line1: shipping.line1 || "",
    city: shipping.city || "",
    country: shipping.country || "",
  };
  const hasProducts = adjusted.some((row) => row.itemType === "product");
  const shippingQuote = hasProducts
    ? calculateShippingRate({
        subtotalCents: subtotalAfter,
        destinationCountry: shippingAddressJson.country,
        totalWeightGrams: built.totalWeightGrams,
      })
    : { shippingCents: 0, methodLabel: "No shipping required" };
  const estimatedTaxCents = hasProducts
    ? calculateEstimatedTaxCents({
        subtotalCents: subtotalAfter,
        shippingCents: shippingQuote.shippingCents,
        destinationCountry: shippingAddressJson.country,
      })
    : 0;
  const estimatedTotal = subtotalAfter + shippingQuote.shippingCents + estimatedTaxCents;

  return NextResponse.json({
    code: coupon.code,
    name: coupon.name,
    subtotalBefore,
    discountCents: disc,
    subtotalAfter,
    shippingCents: shippingQuote.shippingCents,
    taxCents: estimatedTaxCents,
    estimatedTotal,
  });
}
