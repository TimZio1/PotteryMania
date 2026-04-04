import { NextResponse } from "next/server";
import { backfillOrdersToLedger, backfillStudioActivationsToLedger } from "@/lib/finance/backfill-commerce";
import { aggregateFinancialSnapshotsForDate } from "@/lib/finance/aggregate-daily";
import { syncStripeBalanceTransactions } from "@/lib/finance/stripe-balance-sync";
import { runFinancialIntelligence } from "@/lib/finance/intelligence";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderBackfill = await backfillOrdersToLedger(2000);
  const activationBackfill = await backfillStudioActivationsToLedger(2000);
  const stripe = await syncStripeBalanceTransactions(3);

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  await aggregateFinancialSnapshotsForDate(yesterday);
  await aggregateFinancialSnapshotsForDate(new Date());

  const intelligence = await runFinancialIntelligence();

  return NextResponse.json({
    ok: true,
    orderBackfill,
    activationBackfill,
    stripe,
    intelligence,
  });
}
