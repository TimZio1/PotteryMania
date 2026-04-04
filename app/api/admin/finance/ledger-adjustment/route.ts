import { NextResponse } from "next/server";
import type { FinanceLedgerEntryType } from "@prisma/client";
import { requireFinanceAdmin } from "@/lib/finance/admin-guard";
import { LEDGER_SOURCE_SYSTEM } from "@/lib/finance/constants";
import { upsertLedgerEntry } from "@/lib/finance/ledger";

const ALLOWED: FinanceLedgerEntryType[] = [
  "infra_cost",
  "email_cost",
  "ai_cost",
  "storage_cost",
  "manual_adjustment",
];

export async function POST(req: Request) {
  const g = await requireFinanceAdmin();
  if (!g.ok) return g.response;

  let body: {
    entryType?: string;
    amountCents?: number;
    direction?: "credit" | "debit";
    entryDate?: string;
    notes?: string;
    dedupeKey?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entryType = body.entryType as FinanceLedgerEntryType;
  if (!ALLOWED.includes(entryType)) {
    return NextResponse.json({ error: "entryType not allowed for manual POST" }, { status: 400 });
  }
  const amountCents = typeof body.amountCents === "number" ? Math.abs(Math.floor(body.amountCents)) : 0;
  if (amountCents <= 0) {
    return NextResponse.json({ error: "amountCents required" }, { status: 400 });
  }
  const direction = body.direction === "credit" ? "credit" : "debit";
  const entryDate = body.entryDate ? new Date(body.entryDate) : new Date();
  const day = new Date(Date.UTC(entryDate.getUTCFullYear(), entryDate.getUTCMonth(), entryDate.getUTCDate()));
  const dedupeKey =
    body.dedupeKey?.trim() ||
    `manual:${entryType}:${day.toISOString().slice(0, 10)}:${g.user.id}:${Date.now()}`;

  await upsertLedgerEntry({
    dedupeKey,
    entryDate: day,
    entryType,
    amountCents,
    direction,
    sourceSystem: LEDGER_SOURCE_SYSTEM.manual,
    sourceType: "admin_adjustment",
    notes: body.notes ?? `Manual ${entryType} by ${g.user.email}`,
    userId: g.user.id,
  });

  return NextResponse.json({ ok: true, dedupeKey });
}
