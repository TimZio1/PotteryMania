import { NextResponse } from "next/server";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { loadWearCatalogValueSnapshot } from "@/lib/wear-spreadconnect-stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const snapshot = await loadWearCatalogValueSnapshot();
    return NextResponse.json(snapshot);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[admin/wear/catalog-value] failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
