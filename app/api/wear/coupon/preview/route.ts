import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";
import {
  MIN_DISCOUNTED_SUBTOTAL_CENTS,
  normalizeCouponCode,
  validateCouponState,
} from "@/lib/coupon-checkout";
import { logApiError } from "@/lib/monitoring";
import {
  mergeWearRequestLines,
  resolveWearCheckoutLines,
  wearStudioMarginTotals,
  wearStudioMarginWithCommissionOverride,
} from "@/lib/wear-checkout-lines";
import { buildWearEngineLinesFromResolved, computeWearCouponDiscount } from "@/lib/wear-discount-engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "wear_coupon_preview", 40, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { items?: unknown[]; couponCode?: string; studioId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawCode = typeof body.couponCode === "string" ? body.couponCode.trim() : "";
  if (!rawCode) {
    return NextResponse.json({ error: "couponCode required" }, { status: 400 });
  }

  const merged = mergeWearRequestLines(Array.isArray(body.items) ? body.items : []);
  if (merged.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const requestingStudioId = typeof body.studioId === "string" ? body.studioId.trim() || null : null;
  const resolvedPack = await resolveWearCheckoutLines({ mergedLines: merged, requestingStudioId });
  if (!resolvedPack.ok) {
    return NextResponse.json({ error: resolvedPack.error }, { status: resolvedPack.status });
  }

  const code = normalizeCouponCode(rawCode);
  let coupon;
  try {
    coupon = await prisma.coupon.findUnique({ where: { code } });
  } catch (e) {
    logApiError("wear_coupon_preview_db", e, { code }, req);
    return NextResponse.json({ error: "Could not validate code" }, { status: 500 });
  }
  if (!coupon) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const couponErr = validateCouponState(coupon, { surface: "wear" });
  if (couponErr) {
    return NextResponse.json({ error: couponErr }, { status: 400 });
  }

  const engineLines = buildWearEngineLinesFromResolved({
    resolved: resolvedPack.resolved.map((r) => ({
      key: r.key,
      productId: r.productId,
      variantId: r.variantId,
      quantity: r.quantity,
      unitCents: r.unitCents,
      baseCents: r.baseCents,
      supplyCostCents: r.supplyCostCents,
      product: r.product,
    })),
  });

  const disc = computeWearCouponDiscount({ coupon, lines: engineLines });
  if (!disc.ok) {
    return NextResponse.json({ error: disc.error }, { status: 400 });
  }

  const subtotalAfter = resolvedPack.preDiscountSubtotalCents - disc.discountCents;
  if (subtotalAfter < MIN_DISCOUNTED_SUBTOTAL_CENTS) {
    return NextResponse.json(
      {
        error: `After this offer, merchandise must be at least €${(MIN_DISCOUNTED_SUBTOTAL_CENTS / 100).toFixed(2)}.`,
      },
      { status: 400 },
    );
  }

  const override = coupon.affiliateCommissionBpsOverride;
  let totalStudioMarginCents = 0;
  let platformRevenueCents = subtotalAfter;
  if (resolvedPack.attributedStudioId && resolvedPack.studioMarginBps > 0) {
    if (override != null && override > 0) {
      const m = wearStudioMarginWithCommissionOverride({
        subtotalAfterCents: subtotalAfter,
        affiliateCommissionBpsOverride: override,
      });
      totalStudioMarginCents = m.totalStudioMarginCents;
      platformRevenueCents = m.platformRevenueCents;
    } else {
      const m = wearStudioMarginTotals({
        resolved: resolvedPack.resolved,
        attributedStudioId: resolvedPack.attributedStudioId,
        studioMarginBps: resolvedPack.studioMarginBps,
        lineTotalAfterByKey: disc.lineTotalAfterByKey,
      });
      totalStudioMarginCents = m.totalStudioMarginCents;
      platformRevenueCents = m.platformRevenueCents;
    }
  }

  return NextResponse.json({
    ok: true,
    code: coupon.code,
    name: coupon.name,
    discountCents: disc.discountCents,
    preDiscountSubtotalCents: resolvedPack.preDiscountSubtotalCents,
    subtotalAfterCents: subtotalAfter,
    currency: resolvedPack.currency.toUpperCase(),
    eligibleSubtotalCents: disc.eligibleSubtotalCents,
    affiliateCommissionBpsOverride: override,
    studioMarginPreviewCents: totalStudioMarginCents,
    platformRevenuePreviewCents: platformRevenueCents,
  });
}
