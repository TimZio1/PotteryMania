import type { CommissionItemType } from "@prisma/client";
import {
  DEFAULT_PLATFORM_COMMISSION_BPS,
  DEFAULT_PLATFORM_COMMISSION_PCT_LABEL,
  platformCommissionPercentLabel,
} from "@/lib/commission-defaults";

export async function resolveGlobalCommissionBps(itemType: CommissionItemType): Promise<number> {
  void itemType;
  return DEFAULT_PLATFORM_COMMISSION_BPS;
}

export async function resolveCommissionBps(
  studioId: string,
  itemType: CommissionItemType
): Promise<number> {
  void studioId;
  void itemType;
  return DEFAULT_PLATFORM_COMMISSION_BPS;
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
    return platformCommissionPercentLabel(DEFAULT_PLATFORM_COMMISSION_BPS);
  } catch {
    return DEFAULT_PLATFORM_COMMISSION_PCT_LABEL;
  }
}
