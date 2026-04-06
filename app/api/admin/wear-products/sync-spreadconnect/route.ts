import { NextResponse } from "next/server";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { syncSpreadconnectCatalogToWearProducts } from "@/lib/wear-spreadconnect-catalog-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await syncSpreadconnectCatalogToWearProducts();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[admin wear-products sync-spreadconnect]", error);
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
