import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFinanceAdmin } from "@/lib/finance/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await requireFinanceAdmin();
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "ledger";
  const days = Math.min(366, Math.max(1, Number(searchParams.get("days") ?? "30")));
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);

  if (type === "ledger") {
    const entries = await prisma.financeLedgerEntry.findMany({
      where: { entryDate: { gte: from } },
      orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
    });
    const header =
      "entryDate,entryType,amountCents,currency,direction,sourceSystem,sourceType,userId,orderId,dedupeKey\n";
    const lines = entries.map(
      (e) =>
        `${e.entryDate.toISOString().slice(0, 10)},${e.entryType},${e.amountCents},${e.currency},${e.direction},${e.sourceSystem},${e.sourceType},${e.userId ?? ""},${e.orderId ?? ""},${e.dedupeKey ?? ""}`
    );
    return new NextResponse(header + lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="finance-ledger-${days}d.csv"`,
      },
    });
  }

  if (type === "snapshots") {
    const rows = await prisma.financialSnapshotDaily.findMany({
      where: { snapshotDate: { gte: from }, scopeType: "platform", scopeId: "" },
      orderBy: { snapshotDate: "asc" },
    });
    const header = "date,revenueCents,costCents,profitCents,marginBps\n";
    const lines = rows.map(
      (s) =>
        `${s.snapshotDate.toISOString().slice(0, 10)},${s.revenueCents},${s.costCents},${s.profitCents},${s.marginBps ?? ""}`
    );
    return new NextResponse(header + lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="finance-snapshots-${days}d.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Unknown type (ledger|snapshots)" }, { status: 400 });
}
