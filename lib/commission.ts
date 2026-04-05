import { prisma } from "@/lib/db";
import type { CommissionItemType } from "@prisma/client";
import {
  DEFAULT_PLATFORM_COMMISSION_BPS,
  DEFAULT_PLATFORM_COMMISSION_PCT_LABEL,
  platformCommissionPercentLabel,
} from "@/lib/commission-defaults";

const DEFAULT_BPS_KEY = "default_product_commission_bps";

/** Active global rule + `admin_configs` fallback + code default (no per-studio vendor rule). */
export async function resolveGlobalCommissionBps(itemType: CommissionItemType): Promise<number> {
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
  return DEFAULT_PLATFORM_COMMISSION_BPS;
}

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

  return resolveGlobalCommissionBps(itemType);
}

export function commissionCentsFromLine(lineTotalCents: number, basisPoints: number): number {
  return Math.floor((lineTotalCents * basisPoints) / 10000);
}

/**
 * Public marketing copy: global product + booking rates (matches `/admin/settings`).
 * On DB unreachable (e.g. `next build` without Postgres), returns code default label.
 */
export async function getMarketingCheckoutCommissionPctLabel(): Promise<string> {
  try {
    const [p, b] = await Promise.all([
      resolveGlobalCommissionBps("product"),
      resolveGlobalCommissionBps("booking"),
    ]);
    if (p === b) return platformCommissionPercentLabel(p);
    const lo = Math.min(p, b);
    const hi = Math.max(p, b);
    return `${platformCommissionPercentLabel(lo)}–${platformCommissionPercentLabel(hi)}`;
  } catch {
    return DEFAULT_PLATFORM_COMMISSION_PCT_LABEL;
  }
}
