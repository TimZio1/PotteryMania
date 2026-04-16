import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import {
  resolveStudioPlanPricingConfig,
  resolveTierCommissionMatrix,
  saveStudioPlanPricingConfig,
  saveTierCommissionMatrix,
  type TierCommissionMatrix,
} from "@/lib/studio-plan-pricing-config";
import type { StudioPlanPricingConfig } from "@/lib/studio-plan-pricing";

export const dynamic = "force-dynamic";

function isPlanKey(value: string): value is keyof StudioPlanPricingConfig {
  return value === "bookings" || value === "shop" || value === "both" || value === "pro";
}

export async function GET() {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [planPricing, tierCommission] = await Promise.all([
    resolveStudioPlanPricingConfig(),
    resolveTierCommissionMatrix(),
  ]);
  return NextResponse.json({ planPricing, tierCommission });
}

export async function PATCH(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    planPricing?: Partial<StudioPlanPricingConfig>;
    tierCommission?: Partial<TierCommissionMatrix>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const [beforePlans, beforeTier] = await Promise.all([
    resolveStudioPlanPricingConfig(),
    resolveTierCommissionMatrix(),
  ]);

  const nextPlans: StudioPlanPricingConfig = {
    bookings: { ...beforePlans.bookings },
    shop: { ...beforePlans.shop },
    both: { ...beforePlans.both },
    pro: { ...beforePlans.pro },
  };
  if (body.planPricing && typeof body.planPricing === "object") {
    for (const [key, value] of Object.entries(body.planPricing)) {
      if (!isPlanKey(key) || !value || typeof value !== "object") continue;
      const row = value as Partial<StudioPlanPricingConfig[typeof key]>;
      if (typeof row.monthlyCents === "number" && Number.isFinite(row.monthlyCents)) {
        nextPlans[key].monthlyCents = Math.max(0, Math.round(row.monthlyCents));
      }
      if (
        typeof row.annualMonthlyEquivalentCents === "number" &&
        Number.isFinite(row.annualMonthlyEquivalentCents)
      ) {
        nextPlans[key].annualMonthlyEquivalentCents = Math.max(0, Math.round(row.annualMonthlyEquivalentCents));
      }
    }
  }

  const nextTier: TierCommissionMatrix = {
    bookings: { ...beforeTier.bookings },
    shop: { ...beforeTier.shop },
    both: { ...beforeTier.both },
    pro: { ...beforeTier.pro },
  };
  if (body.tierCommission && typeof body.tierCommission === "object") {
    for (const [key, value] of Object.entries(body.tierCommission)) {
      if (!isPlanKey(key) || !value || typeof value !== "object") continue;
      const row = value as Partial<TierCommissionMatrix[typeof key]>;
      if (typeof row.productBps === "number" && Number.isFinite(row.productBps)) {
        nextTier[key].productBps = Math.max(0, Math.min(10_000, Math.round(row.productBps)));
      }
      if (typeof row.bookingBps === "number" && Number.isFinite(row.bookingBps)) {
        nextTier[key].bookingBps = Math.max(0, Math.min(10_000, Math.round(row.bookingBps)));
      }
    }
  }

  await Promise.all([saveStudioPlanPricingConfig(nextPlans), saveTierCommissionMatrix(nextTier)]);

  await logAdminAction({
    actorUserId: user.id,
    action: "admin_config.studio_pricing_and_tier_commission",
    entityType: "admin_config",
    entityId: "studio_pricing_tier_commission",
    before: { planPricing: beforePlans, tierCommission: beforeTier },
    after: { planPricing: nextPlans, tierCommission: nextTier },
    reason: "Updated studio tier pricing and commission matrix",
  });

  return NextResponse.json({ ok: true, planPricing: nextPlans, tierCommission: nextTier });
}
