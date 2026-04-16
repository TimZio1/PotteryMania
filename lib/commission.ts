import type { CommissionItemType } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  DEFAULT_PLATFORM_COMMISSION_BPS,
  DEFAULT_PLATFORM_COMMISSION_PCT_LABEL,
  platformCommissionPercentLabel,
} from "@/lib/commission-defaults";
import {
  resolveStudioPlanKeyByStudioId,
  resolveTierCommissionMatrix,
} from "@/lib/studio-plan-pricing-config";

const ADMIN_CONFIG_PRODUCT_KEY = "default_product_commission_bps";
const ADMIN_CONFIG_BOOKING_KEY = "default_booking_commission_bps";

function toConfigKey(itemType: CommissionItemType) {
  return itemType === "booking" ? ADMIN_CONFIG_BOOKING_KEY : ADMIN_CONFIG_PRODUCT_KEY;
}

function parseConfigBps(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return Math.round(raw);
  }
  if (typeof raw === "string") {
    const parsed = parseInt(raw.trim(), 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  if (raw && typeof raw === "object" && "bps" in (raw as Record<string, unknown>)) {
    return parseConfigBps((raw as { bps?: unknown }).bps);
  }
  return null;
}

export async function resolveGlobalCommissionBps(itemType: CommissionItemType): Promise<number> {
  try {
    const globalRule = await prisma.commissionRule.findFirst({
      where: { ruleScope: "global", itemType, isActive: true },
      orderBy: { updatedAt: "desc" },
      select: { percentageBasisPoints: true },
    });
    if (globalRule && globalRule.percentageBasisPoints >= 0) {
      return globalRule.percentageBasisPoints;
    }

    const config = await prisma.adminConfig.findUnique({
      where: { configKey: toConfigKey(itemType) },
      select: { configValue: true },
    });
    const fromConfig = parseConfigBps(config?.configValue);
    if (fromConfig != null) return fromConfig;

    return DEFAULT_PLATFORM_COMMISSION_BPS;
  } catch {
    return DEFAULT_PLATFORM_COMMISSION_BPS;
  }
}

export async function resolveCommissionBps(
  studioId: string,
  itemType: CommissionItemType
): Promise<number> {
  try {
    const vendorRule = await prisma.commissionRule.findFirst({
      where: { studioId, ruleScope: "vendor", itemType, isActive: true },
      orderBy: { updatedAt: "desc" },
      select: { percentageBasisPoints: true },
    });
    if (vendorRule && vendorRule.percentageBasisPoints >= 0) {
      return vendorRule.percentageBasisPoints;
    }
  } catch {
    // Ignore and fall back to global/default below.
  }
  try {
    const planKey = await resolveStudioPlanKeyByStudioId(studioId);
    if (planKey) {
      const matrix = await resolveTierCommissionMatrix();
      const byPlan = matrix[planKey];
      if (byPlan) {
        return itemType === "booking" ? byPlan.bookingBps : byPlan.productBps;
      }
    }
  } catch {
    // Ignore and fall back to global/default below.
  }
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
    const matrix = await resolveTierCommissionMatrix();
    const productValues = [matrix.bookings.productBps, matrix.shop.productBps, matrix.both.productBps, matrix.pro.productBps];
    const minBps = Math.min(...productValues);
    const maxBps = Math.max(...productValues);
    if (minBps === maxBps) return platformCommissionPercentLabel(minBps);
    return `from ${platformCommissionPercentLabel(minBps)}`;
  } catch {
    return DEFAULT_PLATFORM_COMMISSION_PCT_LABEL;
  }
}
