import { NextResponse } from "next/server";
import {
  getStudioPlanCommissionLabelMap,
  resolveStudioPlanPricingConfig,
} from "@/lib/studio-plan-pricing-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const [planPricing, commissionLabels] = await Promise.all([
    resolveStudioPlanPricingConfig(),
    getStudioPlanCommissionLabelMap(),
  ]);
  return NextResponse.json({ planPricing, commissionLabels });
}
