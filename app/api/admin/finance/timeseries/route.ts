import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFinanceAdmin } from "@/lib/finance/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await requireFinanceAdmin();
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 90 * 86400000);
  const to = toStr ? new Date(toStr) : new Date();

  const rows = await prisma.financialSnapshotDaily.findMany({
    where: {
      scopeType: "platform",
      scopeId: "",
      snapshotDate: { gte: from, lte: to },
    },
    orderBy: { snapshotDate: "asc" },
  });

  return NextResponse.json({
    points: rows.map((s) => ({
      date: s.snapshotDate.toISOString().slice(0, 10),
      revenueCents: s.revenueCents,
      costCents: s.costCents,
      profitCents: s.profitCents,
      marginBps: s.marginBps,
      metrics: s.metrics,
    })),
  });
}
