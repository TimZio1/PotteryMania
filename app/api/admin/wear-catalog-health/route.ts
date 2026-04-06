import { NextResponse } from "next/server";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { getWearCatalogHealthSnapshot } from "@/lib/wear-catalog-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const snapshot = await getWearCatalogHealthSnapshot();
  return NextResponse.json(snapshot);
}
