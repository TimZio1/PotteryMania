import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeStreamProfitability } from "./profitability";

export type ScenarioInputs = {
  /** Delta in basis points applied to product commission (e.g. 50 = +0.5%) */
  productCommissionBpsDelta?: number;
  bookingCommissionBpsDelta?: number;
  /** Elasticity: assumed % change in volume per 1% price change (negative) */
  demandElasticity?: number;
  /** Optional fixed new monthly infra/email cost */
  addedMonthlyFixedCostCents?: number;
};

export type ScenarioOutputs = {
  baseline: {
    marketplaceRevenueCents: number;
    bookingRevenueCents: number;
    totalCommissionCents: number;
    sharedCostCents: number;
    profitCents: number;
  };
  projected: {
    marketplaceRevenueCents: number;
    bookingRevenueCents: number;
    totalCommissionCents: number;
    sharedCostCents: number;
    profitCents: number;
  };
  deltas: {
    revenueCents: number;
    profitCents: number;
    arpuProxyDeltaPct: number;
  };
  assumptions: Record<string, number | string>;
};

/**
 * Simple pricing / take-rate simulator using last-30d stream profitability as baseline.
 */
export async function runPricingSimulation(
  inputs: ScenarioInputs,
  actorUserId?: string | null
): Promise<{ id: string; outputs: ScenarioOutputs }> {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 30);

  const streams = await computeStreamProfitability(from, to);
  const market = streams.find((s) => s.stream === "marketplace_transactional")!;
  const book = streams.find((s) => s.stream === "booking_transactional")!;
  const activation = streams.find((s) => s.stream === "activation_fee")!;

  const totalCommission = market.revenueCents + book.revenueCents + activation.revenueCents;
  const sharedCost = market.costAllocatedCents + book.costAllocatedCents;
  const baselineProfit = totalCommission - sharedCost;

  const elasticity = inputs.demandElasticity ?? -0.3;
  const prodDelta = (inputs.productCommissionBpsDelta ?? 0) / 10000;
  const bookDelta = (inputs.bookingCommissionBpsDelta ?? 0) / 10000;

  const pctChangeProd = prodDelta * 100 * Math.abs(elasticity);
  const pctChangeBook = bookDelta * 100 * Math.abs(elasticity);

  const newMarketRev = Math.round(market.revenueCents * (1 + prodDelta) * (1 - pctChangeProd / 100));
  const newBookRev = Math.round(book.revenueCents * (1 + bookDelta) * (1 - pctChangeBook / 100));
  const newActivation = activation.revenueCents;
  const newTotalComm = newMarketRev + newBookRev + newActivation;
  const newShared = sharedCost + (inputs.addedMonthlyFixedCostCents ?? 0);
  const newProfit = newTotalComm - newShared;

  const outputs: ScenarioOutputs = {
    baseline: {
      marketplaceRevenueCents: market.revenueCents,
      bookingRevenueCents: book.revenueCents,
      totalCommissionCents: totalCommission,
      sharedCostCents: sharedCost,
      profitCents: baselineProfit,
    },
    projected: {
      marketplaceRevenueCents: newMarketRev,
      bookingRevenueCents: newBookRev,
      totalCommissionCents: newTotalComm,
      sharedCostCents: newShared,
      profitCents: newProfit,
    },
    deltas: {
      revenueCents: newTotalComm - totalCommission,
      profitCents: newProfit - baselineProfit,
      arpuProxyDeltaPct:
        totalCommission > 0 ? ((newTotalComm - totalCommission) / totalCommission) * 100 : 0,
    },
    assumptions: {
      demandElasticity: elasticity,
      productCommissionBpsDelta: inputs.productCommissionBpsDelta ?? 0,
      bookingCommissionBpsDelta: inputs.bookingCommissionBpsDelta ?? 0,
      addedMonthlyFixedCostCents: inputs.addedMonthlyFixedCostCents ?? 0,
    },
  };

  const scenario = await prisma.pricingScenario.create({
    data: {
      name: `Simulation ${new Date().toISOString()}`,
      inputs: inputs as unknown as Prisma.InputJsonValue,
      outputs: outputs as unknown as Prisma.InputJsonValue,
      createdById: actorUserId ?? undefined,
    },
  });

  return { id: scenario.id, outputs };
}
