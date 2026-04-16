import { NextResponse } from "next/server";
import { resolveStudioPlanPricingConfig } from "@/lib/studio-plan-pricing-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const planPricing = await resolveStudioPlanPricingConfig();
  return NextResponse.json({ planPricing });
}
