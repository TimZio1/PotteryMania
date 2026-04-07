import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFinanceAdmin } from "@/lib/finance/admin-guard";

export const dynamic = "force-dynamic";

/** CSV export of ledger rows; `from` / `to` as ISO date (YYYY-MM-DD), optional. */
export async function GET(req: Request) {
  const g = await requireFinanceAdmin();
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const days = Math.min(366, Math.max(1, Number(searchParams.get("days") ?? "90")));

  let from: Date;
  let to: Date;
  if (fromStr && toStr) {
    from = new Date(`${fromStr}T00:00:00.000Z`);
    to = new Date(`${toStr}T23:59:59.999Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ error: "Invalid from/to date" }, { status: 400 });
    }
  } else {
    to = new Date();
    from = new Date();
    from.setUTCDate(from.getUTCDate() - days);
  }

  const entries = await prisma.financeLedgerEntry.findMany({
    where: { entryDate: { gte: from, lte: to } },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });
  const header =
    "entryDate,entryType,amountCents,currency,direction,sourceSystem,sourceType,sourceId,userId,orderId,bookingId,dedupeKey,notes\n";
  const esc = (s: string | null | undefined) => {
    const t = (s ?? "").replace(/"/g, '""');
    return `"${t}"`;
  };
  const lines = entries.map(
    (e) =>
      `${e.entryDate.toISOString().slice(0, 10)},${e.entryType},${e.amountCents},${e.currency},${e.direction},${e.sourceSystem},${e.sourceType},${esc(e.sourceId)},${e.userId ?? ""},${e.orderId ?? ""},${e.bookingId ?? ""},${esc(e.dedupeKey)},${esc(e.notes)}`,
  );
  const tag = `${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}`;
  return new NextResponse(header + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finance-ledger-${tag}.csv"`,
    },
  });
}
