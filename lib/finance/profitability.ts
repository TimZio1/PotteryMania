import { prisma } from "@/lib/db";

export type UserProfitRow = {
  userId: string;
  email: string | null;
  revenueCents: number;
  costCents: number;
  profitCents: number;
  marginBps: number | null;
  classification: "high_profit" | "low_profit" | "loss_making" | "neutral";
};

export type StreamProfitRow = {
  stream: "marketplace_transactional" | "booking_transactional" | "activation_fee" | "subscription";
  revenueCents: number;
  costAllocatedCents: number;
  profitCents: number;
};

const HIGH_MARGIN_BPS = 2500;
const LOW_MARGIN_BPS = 800;

/**
 * User-level profitability from ledger over a date range (UTC dates).
 */
export async function computeUserProfitability(from: Date, to: Date): Promise<UserProfitRow[]> {
  const entries = await prisma.financeLedgerEntry.findMany({
    where: {
      entryDate: { gte: from, lte: to },
      userId: { not: null },
    },
  });

  const byUser = new Map<string, { revenue: number; cost: number }>();

  for (const e of entries) {
    if (!e.userId) continue;
    const cur = byUser.get(e.userId) ?? { revenue: 0, cost: 0 };

    if (
      e.direction === "credit" &&
      ["platform_commission", "activation_fee"].includes(e.entryType)
    ) {
      cur.revenue += e.amountCents;
    }
    if (
      e.direction === "debit" &&
      ["stripe_fee", "refund", "discount", "ai_cost", "email_cost", "infra_cost", "storage_cost"].includes(
        e.entryType
      )
    ) {
      cur.cost += e.amountCents;
    }

    byUser.set(e.userId, cur);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...byUser.keys()] } },
    select: { id: true, email: true },
  });
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  const rows: UserProfitRow[] = [];
  for (const [userId, { revenue, cost }] of byUser) {
    const profit = revenue - cost;
    const marginBps = revenue > 0 ? Math.round((profit / revenue) * 10000) : null;
    let classification: UserProfitRow["classification"] = "neutral";
    if (revenue <= 0 && cost > 0) classification = "loss_making";
    else if (profit < 0) classification = "loss_making";
    else if (marginBps !== null && marginBps >= HIGH_MARGIN_BPS && profit > 0) classification = "high_profit";
    else if (marginBps !== null && marginBps < LOW_MARGIN_BPS && revenue > 0) classification = "low_profit";
    else if (profit > 0) classification = "low_profit";

    rows.push({
      userId,
      email: emailById.get(userId) ?? null,
      revenueCents: revenue,
      costCents: cost,
      profitCents: profit,
      marginBps,
      classification,
    });
  }

  return rows.sort((a, b) => b.profitCents - a.profitCents);
}

/**
 * Hybrid streams before full subscription billing: split commission using order line composition (one query).
 */
export async function computeStreamProfitability(from: Date, to: Date): Promise<StreamProfitRow[]> {
  const entries = await prisma.financeLedgerEntry.findMany({
    where: { entryDate: { gte: from, lte: to } },
  });

  let activationRevenue = 0;
  let subscriptionRevenue = 0;
  let marketplaceCommission = 0;
  let bookingCommission = 0;
  let sharedCost = 0;

  const orderIds = new Set<string>();
  for (const e of entries) {
    if (e.entryType === "activation_fee" && e.direction === "credit") {
      activationRevenue += e.amountCents;
    }
    if (e.entryType === "platform_commission" && e.direction === "credit" && e.orderId) {
      orderIds.add(e.orderId);
    }
    if (
      e.direction === "debit" &&
      ["stripe_fee", "refund", "discount", "infra_cost", "email_cost", "ai_cost", "storage_cost"].includes(
        e.entryType
      )
    ) {
      sharedCost += e.amountCents;
    }
  }

  if (orderIds.size > 0) {
    const items = await prisma.orderItem.findMany({
      where: { orderId: { in: [...orderIds] } },
      select: { orderId: true, itemType: true },
    });
    const orderHasBooking = new Map<string, boolean>();
    for (const it of items) {
      if (it.itemType === "booking") orderHasBooking.set(it.orderId, true);
    }
    for (const e of entries) {
      if (e.entryType !== "platform_commission" || e.direction !== "credit" || !e.orderId) continue;
      const hasBooking = orderHasBooking.get(e.orderId);
      if (hasBooking) bookingCommission += e.amountCents;
      else marketplaceCommission += e.amountCents;
    }
  } else {
    for (const e of entries) {
      if (e.entryType === "platform_commission" && e.direction === "credit") {
        marketplaceCommission += e.amountCents;
      }
    }
  }

  const sub = await prisma.financeLedgerEntry.findMany({
    where: {
      entryDate: { gte: from, lte: to },
      entryType: "gross_revenue",
      subscriptionId: { not: null },
    },
  });
  subscriptionRevenue = sub.reduce((s, e) => s + (e.direction === "credit" ? e.amountCents : 0), 0);

  const totalCommission = marketplaceCommission + bookingCommission;
  const allocM =
    totalCommission > 0 ? Math.round((sharedCost * marketplaceCommission) / totalCommission) : sharedCost / 2;
  const allocB = sharedCost - allocM;

  return [
    {
      stream: "activation_fee",
      revenueCents: activationRevenue,
      costAllocatedCents: 0,
      profitCents: activationRevenue,
    },
    {
      stream: "marketplace_transactional",
      revenueCents: marketplaceCommission,
      costAllocatedCents: allocM,
      profitCents: marketplaceCommission - allocM,
    },
    {
      stream: "booking_transactional",
      revenueCents: bookingCommission,
      costAllocatedCents: allocB,
      profitCents: bookingCommission - allocB,
    },
    {
      stream: "subscription",
      revenueCents: subscriptionRevenue,
      costAllocatedCents: 0,
      profitCents: subscriptionRevenue,
    },
  ];
}
