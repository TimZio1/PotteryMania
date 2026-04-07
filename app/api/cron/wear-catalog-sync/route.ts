import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { logCronRun } from "@/lib/cron-audit";
import { prisma } from "@/lib/db";
import { syncSpreadconnectCatalogToWearProducts } from "@/lib/wear-spreadconnect-catalog-sync";

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
    void logCronRun("wear-catalog-sync", { ok: false, error: msg });
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }

  await prisma.wearAnalyticsEvent.create({
    data: {
      kind: "wear_catalog_sync_completed",
      payload: result as object,
    },
  });

  void logCronRun("wear-catalog-sync", { ok: true, ...result });
  return NextResponse.json({ ok: true as const, ...result });
}
