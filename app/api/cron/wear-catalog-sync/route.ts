import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { logCronRun } from "@/lib/cron-audit";
import { prisma } from "@/lib/db";
import { syncSpreadconnectCatalogToWearProducts } from "@/lib/wear-spreadconnect-catalog-sync";
import { recordWearCatalogSyncFailure, recordWearCatalogSyncSuccess } from "@/lib/wear-catalog-sync-state";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let result: Awaited<ReturnType<typeof syncSpreadconnectCatalogToWearProducts>>;
  try {
    result = await syncSpreadconnectCatalogToWearProducts();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync failed";
    await recordWearCatalogSyncFailure(msg);
    void logCronRun("wear-catalog-sync", { ok: false, error: msg });
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }

  await recordWearCatalogSyncSuccess(result);

  await prisma.wearAnalyticsEvent.create({
    data: {
      kind: "wear_catalog_sync_completed",
      payload: result as object,
    },
  });

  if (result.fetchedArticles > 5 && result.skipRatio >= 0.85) {
    const recent = await prisma.adminNotification.findFirst({
      where: {
        title: "Wear catalog sync: high skip ratio",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!recent) {
      await prisma.adminNotification.create({
        data: {
          title: "Wear catalog sync: high skip ratio",
          body: `Spreadconnect returned ${result.fetchedArticles} articles but ${result.skippedArticles} were skipped (missing SKU, images, or price). Check upstream articles and sync logs.`,
          level: "warning",
        },
      });
    }
  }

  void logCronRun("wear-catalog-sync", { ok: true, ...result });
  return NextResponse.json({ ok: true as const, ...result });
}
