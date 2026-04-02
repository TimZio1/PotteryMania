import { prisma } from "@/lib/db";
import type { CommissionItemType } from "@prisma/client";

const DEFAULT_BPS_KEY = "default_product_commission_bps";

export async function resolveCommissionBps(
  studioId: string,
  itemType: CommissionItemType
): Promise<number> {
  const vendorRule = await prisma.commissionRule.findFirst({
    where: {
      isActive: true,
      ruleScope: "vendor",
      studioId,
      itemType,
    },
    orderBy: { createdAt: "desc" },
  });
  if (vendorRule) return vendorRule.percentageBasisPoints;

  const globalRule = await prisma.commissionRule.findFirst({
    where: {
      isActive: true,
      ruleScope: "global",
      studioId: null,
      itemType,
    },
    orderBy: { createdAt: "desc" },
  });
  if (globalRule) return globalRule.percentageBasisPoints;

  const fallback = await prisma.adminConfig.findUnique({
    where: { configKey: DEFAULT_BPS_KEY },
  });
  if (fallback?.configValue && typeof fallback.configValue === "object" && "bps" in fallback.configValue) {
    const bps = (fallback.configValue as { bps: number }).bps;
    if (typeof bps === "number" && bps >= 0) return bps;
  }
  return 1000;
}

export function commissionCentsFromLine(lineTotalCents: number, basisPoints: number): number {
  return Math.floor((lineTotalCents * basisPoints) / 10000);
}
