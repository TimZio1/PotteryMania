import { NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance/admin-guard";
import { getFinanceOverview } from "@/lib/finance/overview";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await requireFinanceAdmin();
  if (!g.ok) return g.response;
  const data = await getFinanceOverview();
  return NextResponse.json(data);
}
