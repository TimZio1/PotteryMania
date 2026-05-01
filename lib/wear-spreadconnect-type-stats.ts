import { prisma } from "@/lib/db";
import { normalizeWearSpreadconnectProductTypeKey } from "@/lib/wear-internal-pricing";

export type WearSpreadconnectTypeStat = {
  /** Normalized key matching `rulesByProductType` / `normalizeWearSpreadconnectProductTypeKey`, or `__none__`. */
  key: string;
  displayLabel: string;
  productCount: number;
  minSupplyCents: number | null;
  maxSupplyCents: number | null;
  avgSupplyCents: number | null;
};

/**
 * Aggregates wholesale (`supplyCostCents`) and counts by Spreadconnect product type for admin pricing.
 * Rows with different string casing are merged into one normalized key.
 */
export async function getWearSpreadconnectTypePricingStats(): Promise<WearSpreadconnectTypeStat[]> {
  const raw = await prisma.wearProduct.groupBy({
    by: ["spreadconnectProductTypeName"],
    where: { archivedAt: null },
    _count: { _all: true },
    _min: { supplyCostCents: true },
    _max: { supplyCostCents: true },
    _avg: { supplyCostCents: true },
  });

  const merged = new Map<
    string,
    { displayLabel: string; count: number; min: number | null; max: number | null; sum: number; n: number }
  >();

  for (const g of raw) {
    const nk = normalizeWearSpreadconnectProductTypeKey(g.spreadconnectProductTypeName);
    const key = nk ?? "__none__";
    const label =
      g.spreadconnectProductTypeName?.trim() || "Unknown / manual (no Spreadconnect type)";
    const prev = merged.get(key);
    const count = g._count._all;
    const minC = g._min.supplyCostCents;
    const maxC = g._max.supplyCostCents;
    const avg = g._avg.supplyCostCents;

    if (!prev) {
      merged.set(key, {
        displayLabel: label,
        count,
        min: minC,
        max: maxC,
        sum: avg != null && Number.isFinite(avg) ? avg * count : 0,
        n: avg != null && Number.isFinite(avg) ? count : 0,
      });
    } else {
      prev.count += count;
      prev.min =
        prev.min == null ? minC : minC == null ? prev.min : Math.min(prev.min, minC);
      prev.max =
        prev.max == null ? maxC : maxC == null ? prev.max : Math.max(prev.max, maxC);
      if (avg != null && Number.isFinite(avg)) {
        prev.sum += avg * count;
        prev.n += count;
      }
      if (label.length > prev.displayLabel.length) prev.displayLabel = label;
    }
  }

  return [...merged.entries()]
    .map(([key, v]) => ({
      key,
      displayLabel: v.displayLabel,
      productCount: v.count,
      minSupplyCents: v.min,
      maxSupplyCents: v.max,
      avgSupplyCents: v.n > 0 ? Math.round(v.sum / v.n) : null,
    }))
    .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
}
