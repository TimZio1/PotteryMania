import type { FinanceLedgerEntryType } from "@prisma/client";
import { prisma } from "@/lib/db";

const REVENUE_TYPES: FinanceLedgerEntryType[] = [
  "gross_revenue",
  "platform_commission",
  "activation_fee",
];

const PLATFORM_REVENUE_TYPES: FinanceLedgerEntryType[] = ["platform_commission", "activation_fee"];

/** Platform P&L costs only — vendor_payout is pass-through, not platform COGS */
const COST_TYPES: FinanceLedgerEntryType[] = [
  "stripe_fee",
  "refund",
  "discount",
  "infra_cost",
  "email_cost",
  "ai_cost",
  "storage_cost",
  "manual_adjustment",
];

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Roll ledger into platform daily snapshot + per-user revenue/cost for that day.
 */
export async function aggregateFinancialSnapshotsForDate(date: Date): Promise<void> {
  const day = startOfUtcDay(date);

  const entries = await prisma.financeLedgerEntry.findMany({
    where: { entryDate: day },
  });

  let gmvCents = 0;
  let platformRevenueCents = 0;
  let costCents = 0;

  const userRevenue = new Map<string, number>();
  const userCost = new Map<string, number>();

  for (const e of entries) {
    if (e.entryType === "gross_revenue" && e.direction === "credit") {
      gmvCents += e.amountCents;
    }

    if (PLATFORM_REVENUE_TYPES.includes(e.entryType) && e.direction === "credit") {
      platformRevenueCents += e.amountCents;
    }

    if (COST_TYPES.includes(e.entryType)) {
      if (e.direction === "debit") {
        costCents += e.amountCents;
      } else {
        costCents -= e.amountCents;
      }
    }

    if (e.userId) {
      if (REVENUE_TYPES.includes(e.entryType) && e.direction === "credit") {
        userRevenue.set(e.userId, (userRevenue.get(e.userId) ?? 0) + e.amountCents);
      }
      if (
        ["stripe_fee", "refund", "discount", "ai_cost", "email_cost", "infra_cost", "storage_cost"].includes(
          e.entryType
        )
      ) {
        const c = e.direction === "debit" ? e.amountCents : -e.amountCents;
        userCost.set(e.userId, (userCost.get(e.userId) ?? 0) + Math.max(0, c));
      }
    }
  }

  const profitCents = platformRevenueCents - costCents;
  const marginBps =
    platformRevenueCents > 0 ? Math.round((profitCents / platformRevenueCents) * 10000) : null;

  await prisma.financialSnapshotDaily.upsert({
    where: {
      snapshotDate_scopeType_scopeId: {
        snapshotDate: day,
        scopeType: "platform",
        scopeId: "",
      },
    },
    create: {
      snapshotDate: day,
      scopeType: "platform",
      scopeId: "",
      revenueCents: platformRevenueCents,
      costCents,
      profitCents,
      marginBps,
      metrics: {
        gmvCents,
        platformRevenueCents,
        ledgerEntryCount: entries.length,
      },
    },
    update: {
      revenueCents: platformRevenueCents,
      costCents,
      profitCents,
      marginBps,
      metrics: {
        gmvCents,
        platformRevenueCents,
        ledgerEntryCount: entries.length,
      },
    },
  });

  const userIds = new Set([...userRevenue.keys(), ...userCost.keys()]);
  for (const uid of userIds) {
    const rev = userRevenue.get(uid) ?? 0;
    const cst = userCost.get(uid) ?? 0;
    const prof = rev - cst;
    const mb = rev > 0 ? Math.round((prof / rev) * 10000) : null;
    await prisma.financialSnapshotDaily.upsert({
      where: {
        snapshotDate_scopeType_scopeId: {
          snapshotDate: day,
          scopeType: "user",
          scopeId: uid,
        },
      },
      create: {
        snapshotDate: day,
        scopeType: "user",
        scopeId: uid,
        revenueCents: rev,
        costCents: cst,
        profitCents: prof,
        marginBps: mb,
      },
      update: {
        revenueCents: rev,
        costCents: cst,
        profitCents: prof,
        marginBps: mb,
      },
    });
  }
}
