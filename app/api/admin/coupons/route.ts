import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { normalizeCouponCode } from "@/lib/coupon-checkout";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({
    coupons: coupons.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      percentOff: c.percentOff,
      amountOffCents: c.amountOffCents,
      currency: c.currency,
      maxRedemptions: c.maxRedemptions,
      minSubtotalCents: c.minSubtotalCents,
      redeemedCount: c.redeemedCount,
      validFrom: c.validFrom?.toISOString() ?? null,
      validUntil: c.validUntil?.toISOString() ?? null,
      isActive: c.isActive,
      channel: c.channel,
      wearDiscountMode: c.wearDiscountMode,
      bundleBuy: c.bundleBuy,
      bundleGet: c.bundleGet,
      bundleAppliesTo: c.bundleAppliesTo,
      wearAppliesTo: c.wearAppliesTo,
      wearProductIds: c.wearProductIds,
      stackable: c.stackable,
      affiliateCommissionBpsOverride: c.affiliateCommissionBpsOverride,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    code?: string;
    name?: string | null;
    percentOff?: number | null;
    amountOffCents?: number | null;
    maxRedemptions?: number | null;
    minSubtotalCents?: number | null;
    validFrom?: string | null;
    validUntil?: string | null;
    isActive?: boolean;
    channel?: "general" | "wear_only" | "marketplace_only";
    wearDiscountMode?: "standard" | "bundle";
    bundleBuy?: number | null;
    bundleGet?: number | null;
    bundleAppliesTo?: string | null;
    wearAppliesTo?: string | null;
    wearProductIds?: string[] | null;
    stackable?: boolean;
    affiliateCommissionBpsOverride?: number | null;
  };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_coupons_post_invalid_json", e, undefined, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawCode = typeof body.code === "string" ? body.code.trim() : "";
  if (!rawCode) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }
  const code = normalizeCouponCode(rawCode);
  const channel = body.channel === "wear_only" || body.channel === "marketplace_only" ? body.channel : "general";
  const wearDiscountMode = body.wearDiscountMode === "bundle" ? "bundle" : "standard";

  const pct = body.percentOff != null ? Number(body.percentOff) : null;
  const amt = body.amountOffCents != null ? Number(body.amountOffCents) : null;
  const hasPct = pct != null && Number.isFinite(pct) && pct > 0;
  const hasAmt = amt != null && Number.isFinite(amt) && amt > 0;

  let bundleBuy: number | null = null;
  let bundleGet: number | null = null;
  let bundleAppliesTo: string | null = null;
  if (wearDiscountMode === "bundle") {
    bundleBuy = body.bundleBuy != null ? Math.max(1, Math.floor(Number(body.bundleBuy))) : null;
    bundleGet = body.bundleGet != null ? Math.max(1, Math.floor(Number(body.bundleGet))) : null;
    const bap = typeof body.bundleAppliesTo === "string" ? body.bundleAppliesTo.trim() : "";
    bundleAppliesTo = ["same_product", "category", "all"].includes(bap) ? bap : null;
    if (!bundleBuy || !bundleGet || !bundleAppliesTo) {
      return NextResponse.json(
        { error: "Bundle coupons require bundleBuy, bundleGet, and bundleAppliesTo (same_product | category | all)" },
        { status: 400 },
      );
    }
    if (channel === "marketplace_only") {
      return NextResponse.json({ error: "Bundle offers must be wear-only or general (apparel path)" }, { status: 400 });
    }
  } else {
    if (!hasPct && !hasAmt) {
      return NextResponse.json({ error: "Set either percentOff or amountOffCents" }, { status: 400 });
    }
    if (hasPct && hasAmt) {
      return NextResponse.json({ error: "Use only one of percentOff or amountOffCents" }, { status: 400 });
    }
    if (hasPct && pct! > 100) {
      return NextResponse.json({ error: "percentOff cannot exceed 100" }, { status: 400 });
    }
  }

  const wearAppliesRaw = typeof body.wearAppliesTo === "string" ? body.wearAppliesTo.trim() : "all";
  const wearAppliesTo = ["all", "tshirts", "hoodies", "specific_products"].includes(wearAppliesRaw)
    ? wearAppliesRaw
    : "all";
  let wearProductIds: string[] | null = null;
  if (wearAppliesTo === "specific_products") {
    const ids = Array.isArray(body.wearProductIds) ? body.wearProductIds : [];
    wearProductIds = ids.map((x) => String(x).trim()).filter(Boolean);
    if (wearProductIds.length === 0) {
      return NextResponse.json({ error: "specific_products requires wearProductIds" }, { status: 400 });
    }
  }

  const minSubtotal =
    body.minSubtotalCents != null && Number.isFinite(Number(body.minSubtotalCents))
      ? Math.max(0, Math.floor(Number(body.minSubtotalCents)))
      : null;

  let affiliateOverride: number | null = null;
  if (body.affiliateCommissionBpsOverride != null && Number.isFinite(Number(body.affiliateCommissionBpsOverride))) {
    const v = Math.floor(Number(body.affiliateCommissionBpsOverride));
    if (v < 0 || v > 10000) {
      return NextResponse.json({ error: "affiliateCommissionBpsOverride must be 0–10000 (basis points)" }, { status: 400 });
    }
    affiliateOverride = v > 0 ? v : null;
  }

  const validFrom =
    typeof body.validFrom === "string" && body.validFrom.length > 0 ? new Date(body.validFrom) : null;
  const validUntil =
    typeof body.validUntil === "string" && body.validUntil.length > 0 ? new Date(body.validUntil) : null;
  if (validFrom && Number.isNaN(validFrom.getTime())) {
    return NextResponse.json({ error: "Invalid validFrom" }, { status: 400 });
  }
  if (validUntil && Number.isNaN(validUntil.getTime())) {
    return NextResponse.json({ error: "Invalid validUntil" }, { status: 400 });
  }

  try {
    const created = await prisma.coupon.create({
      data: {
        code,
        name: typeof body.name === "string" ? body.name.trim() || null : null,
        percentOff: wearDiscountMode === "bundle" ? null : hasPct ? Math.floor(pct!) : null,
        amountOffCents: wearDiscountMode === "bundle" ? null : hasAmt ? Math.floor(amt!) : null,
        currency: "EUR",
        maxRedemptions:
          body.maxRedemptions != null && Number.isFinite(Number(body.maxRedemptions))
            ? Math.max(0, Math.floor(Number(body.maxRedemptions)))
            : null,
        minSubtotalCents: minSubtotal,
        validFrom,
        validUntil,
        isActive: body.isActive !== false,
        channel,
        wearDiscountMode,
        bundleBuy,
        bundleGet,
        bundleAppliesTo,
        wearAppliesTo,
        wearProductIds: wearProductIds ?? undefined,
        stackable: body.stackable === true,
        affiliateCommissionBpsOverride: affiliateOverride,
      },
    });
    await logAdminAction({
      actorUserId: user.id,
      action: "coupon.create",
      entityType: "coupon",
      entityId: created.id,
      after: {
        code: created.code,
        percentOff: created.percentOff,
        amountOffCents: created.amountOffCents,
        isActive: created.isActive,
      },
    });
    return NextResponse.json({ id: created.id, code: created.code });
  } catch (e) {
    logApiError("admin_coupons_post_create_failed", e, { code }, req);
    return NextResponse.json({ error: "Could not create coupon (duplicate code?)" }, { status: 400 });
  }
}
