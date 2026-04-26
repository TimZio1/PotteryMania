import { NextResponse } from "next/server";
import { metaWearFeedCsv } from "@/lib/meta-wear-feed";
import { findWearPublicProductsWithVariantsRetrying } from "@/lib/wear-public-catalog-query";
import {
  mapWearProductRowToInternalPricesWithConfig,
  resolveWearInternalPricingConfig,
} from "@/lib/wear-internal-pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await findWearPublicProductsWithVariantsRetrying();
    if (!result.ok) {
      throw result.error instanceof Error ? result.error : new Error("wear catalog query failed");
    }

    const internalPricingConfig = await resolveWearInternalPricingConfig();
    const products = result.rows.map((row) => mapWearProductRowToInternalPricesWithConfig(row, internalPricingConfig));
    const body = metaWearFeedCsv(products);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.warn("[GET /api/meta/wear-catalog.csv]", error);
    return NextResponse.json({ error: "wear_catalog_unavailable" }, { status: 503 });
  }
}
