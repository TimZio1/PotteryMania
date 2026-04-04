import { prisma } from "@/lib/db";
import { computeStreamProfitability, computeUserProfitability } from "./profitability";

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function monthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * Aggregated finance overview for hyperadmin APIs (uses ledger + snapshots).
 */
export async function getFinanceOverview() {
  const now = new Date();
  const today = utcDay(now);
  const month = monthStart(now);
  const from30 = utcDay(new Date(now.getTime() - 29 * 86400000));

  const [todayEntries, monthEntries, platformSnapshots, users, streams] = await Promise.all([
    prisma.financeLedgerEntry.findMany({ where: { entryDate: today } }),
    prisma.financeLedgerEntry.findMany({
      where: { entryDate: { gte: month, lte: today } },
    }),
    prisma.financialSnapshotDaily.findMany({
      where: { scopeType: "platform", scopeId: "", snapshotDate: { gte: from30 } },
      orderBy: { snapshotDate: "asc" },
    }),
    computeUserProfitability(from30, today),
    computeStreamProfitability(month, today),
  ]);

  const fold = (entries: { entryType: string; direction: string; amountCents: number }[]) => {
    let revenue = 0;
    let cost = 0;
    for (const e of entries) {
      if (["platform_commission", "activation_fee"].includes(e.entryType) && e.direction === "credit") {
        revenue += e.amountCents;
      }
      if (
        e.direction === "debit" &&
        ["stripe_fee", "refund", "discount", "infra_cost", "email_cost", "ai_cost", "storage_cost"].includes(
          e.entryType
        )
      ) {
        cost += e.amountCents;
      }
    }
    return { revenueCents: revenue, costCents: cost, profitCents: revenue - cost };
  };

  const todayM = fold(todayEntries);
  const monthM = fold(monthEntries);

  const payingUsers = users.filter((u) => u.revenueCents > 0).length;
  const arpu = payingUsers > 0 ? Math.round(monthM.revenueCents / payingUsers) : 0;

  return {
    today: { ...todayM, marginBps: todayM.revenueCents > 0 ? Math.round((todayM.profitCents / todayM.revenueCents) * 10000) : null },
    month: { ...monthM, marginBps: monthM.revenueCents > 0 ? Math.round((monthM.profitCents / monthM.revenueCents) * 10000) : null },
    timeseries: platformSnapshots.map((s) => ({
      date: s.snapshotDate.toISOString().slice(0, 10),
      revenueCents: s.revenueCents,
      costCents: s.costCents,
      profitCents: s.profitCents,
      marginBps: s.marginBps,
      metrics: s.metrics,
    })),
    streams,
    users: {
      topProfitable: users.filter((u) => u.profitCents > 0).slice(0, 10),
      leastProfitable: [...users].reverse().slice(0, 10),
      lossMaking: users.filter((u) => u.classification === "loss_making").slice(0, 20),
    },
    arpuMonthCents: arpu,
    arppuMonthCents: arpu,
    payingUsersCount: payingUsers,
  };
}
