import { NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance/admin-guard";
import { computeUserProfitability } from "@/lib/finance/profitability";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await requireFinanceAdmin();
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(searchParams.get("days") ?? "30")));
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);

  const rows = await computeUserProfitability(from, to);
  return NextResponse.json({ users: rows });
}
