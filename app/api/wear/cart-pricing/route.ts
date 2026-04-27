import { NextResponse } from "next/server";
import { assertRateLimit } from "@/lib/rate-limit";
import { mergeWearRequestLines, resolveWearCheckoutLines } from "@/lib/wear-checkout-lines";
import { computeWearBuyXGetYDiscount, WEAR_BUY_X_GET_Y_CAMPAIGN } from "@/lib/wear-buy-x-get-y-campaign";

export const dynamic = "force-dynamic";

/** Resolves wear lines with affiliate markup for cart UI (no coupon). */
export async function POST(req: Request) {
  const rate = assertRateLimit(req, "wear_cart_pricing", 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { items?: unknown[]; studioId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const merged = mergeWearRequestLines(Array.isArray(body.items) ? body.items : []);
  if (merged.length === 0) {
    return NextResponse.json({ preDiscountSubtotalCents: 0, currency: "EUR" });
  }

  const requestingStudioId = typeof body.studioId === "string" ? body.studioId.trim() || null : null;
  const pack = await resolveWearCheckoutLines({ mergedLines: merged, requestingStudioId });
  if (!pack.ok) {
    return NextResponse.json({ error: pack.error }, { status: pack.status });
  }
  const campaign = computeWearBuyXGetYDiscount(pack.resolved);

  return NextResponse.json({
    preDiscountSubtotalCents: pack.preDiscountSubtotalCents,
    campaign: {
      label: WEAR_BUY_X_GET_Y_CAMPAIGN.label,
      discountCents: campaign.discountCents,
      freeItemCount: campaign.freeItemCount,
    },
    currency: pack.currency.toUpperCase(),
  });
}
