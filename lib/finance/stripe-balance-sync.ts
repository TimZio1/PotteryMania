import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { LEDGER_SOURCE_SYSTEM } from "./constants";
import { upsertLedgerEntry } from "./ledger";

const PROVIDER = "stripe_balance_transactions";

/**
 * Ingest recent platform Stripe balance transactions. Dedupe keys make re-runs safe.
 * Fetches newest-first pages each run so new activity is always picked up.
 */
export async function syncStripeBalanceTransactions(maxPages = 3): Promise<{
  rows: number;
  error?: string;
}> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { rows: 0, error: "STRIPE_SECRET_KEY not set" };
  }

  const stripe = new Stripe(key);

  const run = await prisma.providerSyncRun.create({
    data: { provider: PROVIDER, status: "running" },
  });

  let rows = 0;
  let page = 0;

  try {
    let list = await stripe.balanceTransactions.list({ limit: 100 });

    while (page < maxPages) {
      for (const bt of list.data) {
        const created = new Date(bt.created * 1000);
        const day = new Date(created.toISOString().slice(0, 10));

        if (bt.fee !== 0) {
          await upsertLedgerEntry({
            dedupeKey: `stripe_bt:${bt.id}:fee`,
            entryDate: day,
            entryType: "stripe_fee",
            amountCents: Math.abs(bt.fee),
            direction: "debit",
            currency: (bt.currency || "eur").toUpperCase(),
            sourceSystem: LEDGER_SOURCE_SYSTEM.stripe,
            sourceType: "balance_transaction",
            sourceId: bt.id,
            notes: `Stripe fee (${bt.type})`,
            metadata: {
              type: bt.type,
              reportingCategory: bt.reporting_category,
              net: bt.net,
              amount: bt.amount,
            },
          });
          rows += 1;
        }

        if (bt.type === "refund" || bt.type === "payment_refund") {
          const amt = Math.abs(bt.amount);
          if (amt > 0) {
            await upsertLedgerEntry({
              dedupeKey: `stripe_bt:${bt.id}:refund`,
              entryDate: day,
              entryType: "refund",
              amountCents: amt,
              direction: "debit",
              currency: (bt.currency || "eur").toUpperCase(),
              sourceSystem: LEDGER_SOURCE_SYSTEM.stripe,
              sourceType: "balance_transaction",
              sourceId: bt.id,
              notes: `Stripe refund (${bt.type})`,
              metadata: { type: bt.type, net: bt.net },
            });
            rows += 1;
          }
        }
      }

      page += 1;
      if (!list.has_more || page >= maxPages) break;
      const last = list.data[list.data.length - 1]?.id;
      if (!last) break;
      list = await stripe.balanceTransactions.list({ limit: 100, starting_after: last });
    }

    await prisma.providerSyncRun.update({
      where: { id: run.id },
      data: {
        status: "succeeded",
        runEndedAt: new Date(),
        rowsProcessed: rows,
      },
    });

    return { rows };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.providerSyncRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        runEndedAt: new Date(),
        errorMessage: msg,
        rowsProcessed: rows,
      },
    });
    return { rows, error: msg };
  }
}
