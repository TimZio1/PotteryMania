import { NextResponse } from "next/server";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { syncSpreadconnectCatalogToWearProducts } from "@/lib/wear-spreadconnect-catalog-sync";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = (await req.json().catch(() => ({}))) as { fullDiscovery?: boolean };
    const fullDiscovery = body.fullDiscovery === true;
    const result = await syncSpreadconnectCatalogToWearProducts({ fullDiscovery });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logApiError("admin_wear_products_sync_spreadconnect", error, {}, req);
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
