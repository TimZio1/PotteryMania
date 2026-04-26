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
import { previewGiftCardRedemption } from "@/lib/gift-cards/checkout";
import { calculateEstimatedTaxCents } from "@/lib/tax";
import { resolveShippingZoneForDestination, zonePriceCents } from "@/lib/shipping-zones";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  const { cartId } = await getCartForRequest(user?.id ?? null);

  let body: {
    code?: string;
    studioId?: string;
    paymentMethod?: "coupon" | "gift_card";
    shippingAddress?: { line1?: string; city?: string; country?: string };
  };
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

  const scopeStudio = typeof body.studioId === "string" ? body.studioId.trim() : undefined;
  const built = await buildCheckoutLineRowsFromCart(cart, scopeStudio ? { studioId: scopeStudio } : undefined);
  if (!built.ok) {
    if (built.status === 409 && "multiVendorStudios" in built) {
      return NextResponse.json(
        { error: built.error, multiVendorStudios: built.multiVendorStudios },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: built.error }, { status: built.status });
  }

  const subtotalBefore = built.subtotal;
  const paymentMethod = body.paymentMethod === "gift_card" ? "gift_card" : "coupon";
  let adjusted = built.lineRows;
  let subtotalAfter = subtotalBefore;
  let discountCode = "";
  let discountName: string | null = null;
  let disc = 0;

  if (paymentMethod === "gift_card") {
    const giftCardPreview = await previewGiftCardRedemption(prisma, raw, subtotalBefore, {
      studioId: built.studioId,
    });
    if (!giftCardPreview.ok) {
      return NextResponse.json({ error: giftCardPreview.error }, { status: giftCardPreview.status });
    }
    disc = giftCardPreview.preview.appliedCents;
    subtotalAfter = giftCardPreview.preview.subtotalAfterGiftCard;
    discountCode = giftCardPreview.preview.giftCard.code;
    discountName = giftCardPreview.preview.giftCard.name;
  } else {
    const code = normalizeCouponCode(raw);
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      return NextResponse.json({ error: "Unknown coupon code" }, { status: 400 });
    }
    const couponErr = validateCouponState(coupon, {
      studioId: built.studioId,
      subtotalCents: subtotalBefore,
      surface: "marketplace",
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
      return NextResponse.json({ error: "Coupon currency is not supported" }, { status: 400 });
    }

    let couponDiscount = computeCouponDiscountCents(coupon, subtotalBefore);
    const lineTotals = built.lineRows.map((r) => r.chargedLineCents);
    const capped = capDiscountForMinimumLineRemainder(lineTotals, couponDiscount, 1);
    if (capped.error) {
      return NextResponse.json({ error: capped.error }, { status: 400 });
    }
    couponDiscount = capped.discountCents;
    if (couponDiscount <= 0) {
      return NextResponse.json({ error: "This coupon does not reduce this order" }, { status: 400 });
    }

    adjusted = applyCouponToLineRows(built.lineRows, built.productBps, built.bookingBps, couponDiscount);
    ({ subtotal: subtotalAfter } = recomputeTotalsFromLineRows(adjusted));
    if (subtotalAfter < MIN_DISCOUNTED_SUBTOTAL_CENTS) {
      return NextResponse.json(
        {
          error: `After the coupon, the order subtotal must be at least €${(MIN_DISCOUNTED_SUBTOTAL_CENTS / 100).toFixed(2)}`,
        },
        { status: 400 },
      );
    }
    disc = couponDiscount;
    discountCode = coupon.code;
    discountName = coupon.name;
  }

  const shipping = body.shippingAddress || {};
  const shippingAddressJson = {
    line1: shipping.line1 || "",
    city: shipping.city || "",
    country: shipping.country || "",
  };
  const hasProducts = adjusted.some((row) => row.itemType === "product");
  if (hasProducts && !shippingAddressJson.country.trim()) {
    return NextResponse.json({ error: "shippingAddress.country is required for shippable products." }, { status: 400 });
  }
  let shippingQuote: { shippingCents: number; methodLabel: string } = { shippingCents: 0, methodLabel: "No shipping required" };
  if (hasProducts) {
    const studio = await prisma.studio.findUnique({
      where: { id: built.studioId },
      select: { country: true },
    });
    if (!studio) {
      return NextResponse.json({ error: "Studio not found for shipping preview." }, { status: 400 });
    }
    const zone = resolveShippingZoneForDestination({
      destinationCountry: shippingAddressJson.country,
      studioCountry: studio.country,
    });
    const productIds = [...new Set(adjusted.filter((r) => r.itemType === "product" && r.productId).map((r) => r.productId!))];
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
    for (const row of adjusted) {
      if (row.itemType !== "product" || !row.productId) continue;
      const p = byId.get(row.productId);
      if (!p) {
        return NextResponse.json({ error: "A cart product is no longer available." }, { status: 409 });
      }
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
        subtotalCents: subtotalAfter,
        shippingCents: shippingQuote.shippingCents,
        destinationCountry: shippingAddressJson.country,
      })
    : 0;
  const estimatedTotal = subtotalAfter + shippingQuote.shippingCents + estimatedTaxCents;

  return NextResponse.json({
    code: discountCode,
    name: discountName,
    paymentMethod,
    subtotalBefore,
    discountCents: disc,
    subtotalAfter,
    shippingCents: shippingQuote.shippingCents,
    taxCents: estimatedTaxCents,
    estimatedTotal,
  });
}
