import { NextResponse } from "next/server";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { getSpreadconnectConfig } from "@/lib/spreadconnect-config";
import { syncSpreadconnectCatalogToWearProducts } from "@/lib/wear-spreadconnect-catalog-sync";
import { recordWearCatalogSyncFailure, recordWearCatalogSyncSuccess } from "@/lib/wear-catalog-sync-state";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Spreadconnect full catalog can take several minutes — allow long serverless runs where supported. */
export const maxDuration = 300;

type Body = { fullDiscovery?: boolean };

export async function POST(req: Request) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!getSpreadconnectConfig()) {
    return NextResponse.json(
      {
        error:
          "Spreadconnect is not configured on this server (missing or placeholder SPREADCONNECT_API_KEY). Set the key in your deployment environment and redeploy.",
      },
      { status: 503 },
    );
  }

  let fullDiscovery = true;
  try {
    const raw = await req.text();
    if (raw.trim()) {
      const j = JSON.parse(raw) as Body;
      if (typeof j.fullDiscovery === "boolean") fullDiscovery = j.fullDiscovery;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof syncSpreadconnectCatalogToWearProducts>>;
  try {
    result = await syncSpreadconnectCatalogToWearProducts({ fullDiscovery });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync failed";
    await recordWearCatalogSyncFailure(msg);
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }

  await recordWearCatalogSyncSuccess(result);

  try {
    await prisma.wearAnalyticsEvent.create({
      data: {
        kind: "wear_catalog_sync_completed",
        payload: { ...result, source: "admin_manual" } as object,
      },
    });
  } catch (e) {
    console.error("[sync-spreadconnect] wear_analytics_events insert failed (sync already completed)", e);
  }

  return NextResponse.json({ ok: true as const, ...result });
}
