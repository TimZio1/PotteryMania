import type { Coupon } from "@prisma/client";
import { allocateDiscountAcrossLines } from "@/lib/coupon-checkout";
import { wearApparelBucketFromProduct, wearLineMatchesScope, type WearApparelBucket } from "@/lib/wear-apparel-scope";

export type WearDiscountEngineLine = {
  key: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  /** Customer unit price before coupon (after affiliate markup when applicable). */
  unitCents: number;
  /** Catalog unit price before affiliate markup. */
  baseCents: number;
  supplyCostCents: number | null;
  bucket: WearApparelBucket;
};

export type WearDiscountEngineResult =
  | {
      ok: true;
      discountCents: number;
      /** Discount cents per cart line key; sums to discountCents. */
      discountByKey: Record<string, number>;
      /** Post-discount line total (unit * qty - discount) per key. */
      lineTotalAfterByKey: Record<string, number>;
      eligibleSubtotalCents: number;
    }
  | { ok: false; error: string };

type BundleAppliesTo = "same_product" | "category" | "all";

function lineTotal(line: WearDiscountEngineLine): number {
  return line.unitCents * line.quantity;
}

function eligibleLines(lines: WearDiscountEngineLine[], coupon: Coupon): WearDiscountEngineLine[] {
  const appliesTo = (coupon.wearAppliesTo ?? "all") as "all" | "tshirts" | "hoodies" | "specific_products";
  return lines.filter((l) =>
    wearLineMatchesScope({
      appliesTo,
      productId: l.productId,
      wearProductIds: coupon.wearProductIds,
      bucket: l.bucket,
    }),
  );
}

function minRevenueForLine(line: WearDiscountEngineLine): number {
  if (line.supplyCostCents == null || line.supplyCostCents < 0) return 0;
  return line.supplyCostCents * line.quantity;
}

/** Ensure (lineTotal - discount) is divisible by quantity so Stripe unit_amount * qty works. */
function snapDiscountForLineDivisibility(lineTotalCents: number, qty: number, requestedDiscount: number): number {
  if (qty <= 0) return 0;
  let d = Math.min(Math.max(0, requestedDiscount), lineTotalCents);
  let post = lineTotalCents - d;
  const r = ((post % qty) + qty) % qty;
  if (r !== 0) d = Math.min(lineTotalCents, d + r);
  return d;
}

function capDiscountBySupplyFloor(
  lines: WearDiscountEngineLine[],
  discountByKey: Record<string, number>,
): { ok: true; discountByKey: Record<string, number> } | { ok: false; error: string } {
  const next = { ...discountByKey };
  for (const line of lines) {
    const t = lineTotal(line);
    const d = next[line.key] ?? 0;
    const minRev = minRevenueForLine(line);
    if (t - d < minRev) {
      return {
        ok: false,
        error:
          minRev > 0
            ? "This offer can’t be applied — it would price an item below cost."
            : "This offer can’t be applied to these items.",
      };
    }
  }
  return { ok: true, discountByKey: next };
}

function finalizeDiscountByKey(
  lines: WearDiscountEngineLine[],
  discountByKey: Record<string, number>,
): { ok: true; discountByKey: Record<string, number>; discountCents: number } | { ok: false; error: string } {
  const adjusted: Record<string, number> = {};
  for (const line of lines) {
    const t = lineTotal(line);
    const raw = Math.min(discountByKey[line.key] ?? 0, t);
    const snapped = snapDiscountForLineDivisibility(t, line.quantity, raw);
    adjusted[line.key] = snapped;
  }
  const capped = capDiscountBySupplyFloor(lines, adjusted);
  if (!capped.ok) return capped;
  let sum = 0;
  for (const line of lines) {
    sum += capped.discountByKey[line.key] ?? 0;
  }
  return { ok: true, discountByKey: capped.discountByKey, discountCents: sum };
}

function expandUnits(eligible: WearDiscountEngineLine[]): { unitCents: number; key: string }[] {
  const out: { unitCents: number; key: string }[] = [];
  for (const line of eligible) {
    for (let i = 0; i < line.quantity; i++) {
      out.push({ unitCents: line.unitCents, key: line.key });
    }
  }
  return out;
}

function bundlePoolKeys(line: WearDiscountEngineLine[], appliesTo: BundleAppliesTo): string[][] {
  if (appliesTo === "all") {
    return [line.map((l) => l.key)];
  }
  if (appliesTo === "same_product") {
    const byPid = new Map<string, string[]>();
    for (const l of line) {
      const k = l.productId;
      const prev = byPid.get(k) ?? [];
      prev.push(l.key);
      byPid.set(k, prev);
    }
    return [...byPid.values()];
  }
  /* category: one pool for all eligible apparel in this coupon scope */
  return [line.map((l) => l.key)];
}

function aggregateBundleFreeDiscount(
  eligible: WearDiscountEngineLine[],
  coupon: Coupon,
): { ok: true; discountByKey: Record<string, number> } | { ok: false; error: string } {
  const buy = coupon.bundleBuy ?? 0;
  const get = coupon.bundleGet ?? 0;
  const appliesTo = (coupon.bundleAppliesTo ?? "all") as BundleAppliesTo;
  if (buy < 1 || get < 1) {
    return { ok: false, error: "Bundle offer is misconfigured" };
  }
  const groupSize = buy + get;
  const discountByKey: Record<string, number> = {};
  for (const l of eligible) {
    discountByKey[l.key] = 0;
  }

  const pools = bundlePoolKeys(eligible, appliesTo);
  const keyToLine = new Map(eligible.map((l) => [l.key, l]));

  for (const poolKeys of pools) {
    const poolLines = poolKeys.map((k) => keyToLine.get(k)!).filter(Boolean);
    if (poolLines.length === 0) continue;
    const units = expandUnits(poolLines);
    if (units.length < groupSize) continue;
    units.sort((a, b) => a.unitCents - b.unitCents);
    const groups = Math.floor(units.length / groupSize);
    const freeCount = groups * get;
    for (let i = 0; i < freeCount; i++) {
      const u = units[i]!;
      discountByKey[u.key] = (discountByKey[u.key] ?? 0) + u.unitCents;
    }
  }

  return { ok: true, discountByKey };
}

export function computeWearCouponDiscount(args: {
  coupon: Coupon;
  lines: WearDiscountEngineLine[];
}): WearDiscountEngineResult {
  const { coupon, lines } = args;
  const eligible = eligibleLines(lines, coupon);
  const eligibleSubtotal = eligible.reduce((s, l) => s + lineTotal(l), 0);

  if (eligible.length === 0) {
    return { ok: false, error: "This code doesn’t apply to anything in your cart." };
  }

  if (coupon.minSubtotalCents != null && eligibleSubtotal < coupon.minSubtotalCents) {
    return {
      ok: false,
      error: `This code needs a minimum of €${(coupon.minSubtotalCents / 100).toFixed(2)} on eligible items.`,
    };
  }

  let discountByKey: Record<string, number> = {};
  for (const l of lines) {
    discountByKey[l.key] = 0;
  }

  if (coupon.wearDiscountMode === "bundle") {
    const b = aggregateBundleFreeDiscount(eligible, coupon);
    if (!b.ok) return b;
    for (const k of Object.keys(b.discountByKey)) {
      discountByKey[k] = b.discountByKey[k] ?? 0;
    }
    const totalDisc = Object.values(discountByKey).reduce((a, b) => a + b, 0);
    if (totalDisc <= 0) {
      return {
        ok: false,
        error: "Add more eligible items to use this bundle offer.",
      };
    }
  } else {
    const pct = coupon.percentOff;
    const amt = coupon.amountOffCents;
    const hasPct = pct != null && pct > 0;
    const hasAmt = amt != null && amt > 0;
    if (!hasPct && !hasAmt) {
      return { ok: false, error: "Offer is misconfigured" };
    }
    if (hasPct && hasAmt) {
      return { ok: false, error: "Offer is misconfigured" };
    }

    let raw = 0;
    if (hasPct) {
      raw = Math.floor((eligibleSubtotal * pct!) / 100);
    } else {
      raw = Math.min(amt!, eligibleSubtotal);
    }
    if (raw <= 0) {
      return { ok: false, error: "This code doesn’t reduce this order." };
    }

    const eligibleTotals = eligible.map((l) => lineTotal(l));
    const alloc = allocateDiscountAcrossLines(eligibleTotals, raw);
    eligible.forEach((l, i) => {
      discountByKey[l.key] = alloc[i] ?? 0;
    });
  }

  const finalized = finalizeDiscountByKey(lines, discountByKey);
  if (!finalized.ok) return finalized;

  const lineTotalAfterByKey: Record<string, number> = {};
  for (const line of lines) {
    const t = lineTotal(line);
    const d = finalized.discountByKey[line.key] ?? 0;
    lineTotalAfterByKey[line.key] = t - d;
  }

  if (finalized.discountCents <= 0) {
    return { ok: false, error: "This code doesn’t reduce this order." };
  }

  return {
    ok: true,
    discountCents: finalized.discountCents,
    discountByKey: finalized.discountByKey,
    lineTotalAfterByKey,
    eligibleSubtotalCents: eligibleSubtotal,
  };
}

export function buildWearEngineLinesFromResolved(args: {
  resolved: Array<{
    key: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    unitCents: number;
    baseCents: number;
    supplyCostCents: number | null;
    product: {
      spreadconnectProductTypeName?: string | null;
      spreadconnectCategoryData?: unknown;
    };
  }>;
}): WearDiscountEngineLine[] {
  return args.resolved.map((r) => ({
    key: r.key,
    productId: r.productId,
    variantId: r.variantId,
    quantity: r.quantity,
    unitCents: r.unitCents,
    baseCents: r.baseCents,
    supplyCostCents: r.supplyCostCents,
    bucket: wearApparelBucketFromProduct(r.product),
  }));
}
