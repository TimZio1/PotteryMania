import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { logCronRun } from "@/lib/cron-audit";
import { prisma } from "@/lib/db";
import { findDuplicateWearVariantSkus } from "@/lib/wear-sku-integrity";
import { applyAutoHideForDuplicateSkuProducts } from "@/lib/wear-duplicate-sku-actions";

export const dynamic = "force-dynamic";

/**
 * Detects duplicate Spreadconnect SKUs across active variants.
 * Optional: set `WEAR_AUTO_HIDE_DUPLICATE_SKU_PRODUCTS=true` to auto-hide conflicting products from public sale.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const duplicates = await findDuplicateWearVariantSkus();
    const autoHide = await applyAutoHideForDuplicateSkuProducts(duplicates);
    if (duplicates.length > 0) {
      const recent = await prisma.adminNotification.findFirst({
        where: {
          title: "Wear SKU duplicates detected",
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!recent) {
        await prisma.adminNotification.create({
          data: {
            title: "Wear SKU duplicates detected",
            body: `${duplicates.length} SKU(s) appear on more than one product. Fulfillment uses SKU — resolve in admin before scaling. Sample: ${duplicates
              .slice(0, 5)
              .map((d) => d.sku)
              .join(", ")}`,
            level: "warning",
          },
        });
      }
    }

    const body = {
      ok: true as const,
      duplicateSkuGroups: duplicates.length,
      samples: duplicates.slice(0, 20),
      autoHide:
        "hiddenProductCount" in autoHide
          ? { hiddenProductCount: autoHide.hiddenProductCount }
          : { skipped: true, reason: autoHide.reason },
    };
    void logCronRun("wear-sku-integrity", body);
    return NextResponse.json(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "check failed";
    void logCronRun("wear-sku-integrity", { ok: false, error: msg });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
