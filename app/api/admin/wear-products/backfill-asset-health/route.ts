import { NextResponse } from "next/server";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { backfillWearAssetHealthReady } from "@/lib/wear-asset-health-backfill";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await backfillWearAssetHealthReady();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logApiError("admin_wear_products_backfill_asset_health", error, {}, req);
    const message = error instanceof Error ? error.message : "Backfill failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
