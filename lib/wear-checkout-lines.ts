import { prisma } from "@/lib/db";
import {
  calculateWearPrice,
  resolveStudioMarginBps,
  resolveWearGlobalPricing,
} from "@/lib/wear-commission";
import { wearPublicProductWhere } from "@/lib/wear-public-filter";
import {
  assertWearUnitNotBelowCost,
  calculateWearInternalListCents,
  mapWearProductRowToInternalPrices,
  shouldUseInternalWearPricing,
  wearEffectiveCostCents,
} from "@/lib/wear-internal-pricing";
import { wearDisplayName } from "@/lib/wear-display-name";

export type MergedWearLine = { productId: string; variantId: string | null; quantity: number };

type BodyLine = { productId?: unknown; variantId?: unknown; quantity?: unknown };

export function mergeWearRequestLines(rawItems: unknown[]): MergedWearLine[] {
  const merged = new Map<string, MergedWearLine>();
  const arr = Array.isArray(rawItems) ? rawItems : [];
  for (const line of arr) {
    if (!line || typeof line !== "object") continue;
    const l = line as BodyLine;
    const productId = typeof l.productId === "string" ? l.productId.trim() : "";
    const vRaw = l.variantId;
    const variantId =
      typeof vRaw === "string" && vRaw.trim().length > 0 ? vRaw.trim() : null;
    const qRaw = l.quantity;
    const q =
      typeof qRaw === "number"
        ? Math.floor(qRaw)
        : typeof qRaw === "string"
          ? parseInt(qRaw, 10)
          : NaN;
    if (!productId || !Number.isFinite(q)) continue;
    const qty = Math.min(99, Math.max(1, q));
    const key = `${productId}::${variantId ?? ""}`;
    const prev = merged.get(key);
    merged.set(key, {
      productId,
      variantId,
      quantity: (prev?.quantity ?? 0) + qty,
    });
  }
  return [...merged.values()];
}

export function wearLineMergeKey(productId: string, variantId: string | null) {
  return `${productId}::${variantId ?? ""}`;
}

export type ResolvedWearCheckoutLine = {
  key: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitCents: number;
  baseCents: number;
  supplyCostCents: number | null;
  lineName: string;
  product: {
    id: string;
    name: string;
    subtitle: string | null;
    images: unknown;
    priceCents: number;
    currency: string;
    spreadconnectProductTypeName: string | null;
    spreadconnectCategoryData: unknown;
  };
  variant: { id: string; label: string; priceCents: number | null; stockQuantity: number | null } | null;
};

export async function resolveWearCheckoutLines(args: {
  mergedLines: MergedWearLine[];
  requestingStudioId: string | null;
}): Promise<
  | { ok: false; status: number; error: string }
  | {
      ok: true;
      resolved: ResolvedWearCheckoutLine[];
      products: ResolvedWearCheckoutLine["product"][];
      currency: string;
      attributedStudioId: string | null;
      studioMarginBps: number;
      preDiscountSubtotalCents: number;
    }
> {
  const { mergedLines, requestingStudioId } = args;
  if (mergedLines.length === 0) {
    return { ok: false, status: 400, error: "Cart is empty" };
  }

  const productIds = [...new Set(mergedLines.map((l) => l.productId))];
  const products = await prisma.wearProduct.findMany({
    where: {
      ...wearPublicProductWhere(),
      id: { in: productIds },
    },
    include: {
      variants: { where: { isActive: true } },
    },
  });

  if (products.length !== productIds.length) {
    return { ok: false, status: 400, error: "One or more products are unavailable" };
  }

  const productById = new Map(products.map((p) => [p.id, p]));
  const currency = (products[0]?.currency ?? "EUR").toLowerCase();
  for (const p of products) {
    if (p.currency.toLowerCase() !== currency) {
      return { ok: false, status: 400, error: "Mixed currencies are not supported" };
    }
  }

  let attributedStudioId: string | null = null;
  let studioMarginBps = 0;
  if (requestingStudioId) {
    const wearConfig = await prisma.studioWearConfig.findUnique({
      where: { studioId: requestingStudioId },
      select: { enabled: true, marginBps: true },
    });
    if (wearConfig?.enabled) {
      attributedStudioId = requestingStudioId;
      const global = await resolveWearGlobalPricing();
      studioMarginBps = resolveStudioMarginBps(wearConfig.marginBps, global);
    }
  }

  const resolved: ResolvedWearCheckoutLine[] = [];

  for (const line of mergedLines) {
    const p = productById.get(line.productId);
    if (!p) return { ok: false, status: 400, error: "Invalid product" };

    const activeVariantCount = p.variants.length;
    let variant: (typeof p.variants)[0] | null = null;

    if (activeVariantCount > 0) {
      if (!line.variantId) {
        return { ok: false, status: 400, error: "Variant required for one or more items" };
      }
      variant = p.variants.find((v) => v.id === line.variantId) ?? null;
      if (!variant) {
        return { ok: false, status: 400, error: "Invalid variant" };
      }
      if (variant.stockQuantity != null && variant.stockQuantity < line.quantity) {
        return { ok: false, status: 409, error: `Insufficient stock: ${p.name}` };
      }
    } else if (line.variantId) {
      return { ok: false, status: 400, error: "This product has no variants" };
    }

    const priced = mapWearProductRowToInternalPrices(p);
    const internalPricing = shouldUseInternalWearPricing();
    const baseCents = internalPricing
      ? calculateWearInternalListCents({
          supplyCostCents: priced.supplyCostCents,
          spreadconnectProductTypeName: priced.spreadconnectProductTypeName,
          spreadconnectCategoryData: priced.spreadconnectCategoryData,
        })
      : (variant?.priceCents ?? priced.priceCents);
    let unitCents = baseCents;
    if (attributedStudioId && studioMarginBps > 0) {
      unitCents = calculateWearPrice(baseCents, studioMarginBps);
    }
    if (internalPricing) {
      try {
        assertWearUnitNotBelowCost({
          unitPriceCents: unitCents,
          supplyCostCents: priced.supplyCostCents,
          spreadconnectProductTypeName: priced.spreadconnectProductTypeName,
          spreadconnectCategoryData: priced.spreadconnectCategoryData,
        });
      } catch {
        return { ok: false, status: 400, error: "Pricing configuration error — contact support." };
      }
    }
    const supplyFloor = internalPricing
      ? wearEffectiveCostCents({
          supplyCostCents: priced.supplyCostCents,
          spreadconnectProductTypeName: priced.spreadconnectProductTypeName,
          spreadconnectCategoryData: priced.spreadconnectCategoryData,
        })
      : (priced.supplyCostCents ?? null);
    const displayName = wearDisplayName(p);
    const lineName = variant ? `${displayName} — ${variant.label}` : displayName;
    const key = wearLineMergeKey(line.productId, line.variantId);

    resolved.push({
      key,
      productId: p.id,
      variantId: variant?.id ?? null,
      quantity: line.quantity,
      unitCents,
      baseCents,
      supplyCostCents: supplyFloor,
      lineName,
      product: {
        id: p.id,
        name: p.name,
        subtitle: p.subtitle,
        images: p.images,
        priceCents: p.priceCents,
        currency: p.currency,
        spreadconnectProductTypeName: p.spreadconnectProductTypeName,
        spreadconnectCategoryData: p.spreadconnectCategoryData,
      },
      variant: variant
        ? { id: variant.id, label: variant.label, priceCents: variant.priceCents, stockQuantity: variant.stockQuantity }
        : null,
    });
  }

  let preDiscountSubtotalCents = 0;
  for (const r of resolved) {
    preDiscountSubtotalCents += r.unitCents * r.quantity;
  }

  return {
    ok: true,
    resolved,
    products: resolved.map((r) => r.product),
    currency,
    attributedStudioId,
    studioMarginBps,
    preDiscountSubtotalCents,
  };
}

export function wearStudioMarginTotals(args: {
  resolved: ResolvedWearCheckoutLine[];
  attributedStudioId: string | null;
  studioMarginBps: number;
  /** Per-line totals after coupon (cents). Keys = wearLineMergeKey */
  lineTotalAfterByKey: Record<string, number>;
}): { totalStudioMarginCents: number; platformRevenueCents: number; subtotalAfterCents: number } {
  const { resolved, attributedStudioId, studioMarginBps, lineTotalAfterByKey } = args;
  let subtotalAfterCents = 0;
  for (const r of resolved) {
    subtotalAfterCents += lineTotalAfterByKey[r.key] ?? r.unitCents * r.quantity;
  }

  if (!attributedStudioId || studioMarginBps <= 0) {
    return { totalStudioMarginCents: 0, platformRevenueCents: subtotalAfterCents, subtotalAfterCents };
  }

  const bps = Math.max(0, Math.min(10000, Math.floor(studioMarginBps)));
  const totalStudioMarginCents = Math.round((subtotalAfterCents * bps) / 10000);
  const platformRevenueCents = subtotalAfterCents - totalStudioMarginCents;
  return { totalStudioMarginCents, platformRevenueCents, subtotalAfterCents };
}

export function wearStudioMarginWithCommissionOverride(args: {
  subtotalAfterCents: number;
  affiliateCommissionBpsOverride: number;
}): { totalStudioMarginCents: number; platformRevenueCents: number } {
  const bps = Math.max(0, Math.min(10000, Math.floor(args.affiliateCommissionBpsOverride)));
  const totalStudioMarginCents = Math.round((args.subtotalAfterCents * bps) / 10000);
  return {
    totalStudioMarginCents,
    platformRevenueCents: args.subtotalAfterCents - totalStudioMarginCents,
  };
}
