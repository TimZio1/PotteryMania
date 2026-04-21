import { prisma } from "@/lib/db";
import {
  DEFAULT_PLATFORM_COMMISSION_BPS,
  tierPlatformCommissionIncludeLine,
  platformCommissionPercentLabel,
} from "@/lib/commission-defaults";
import {
  DEFAULT_STUDIO_PLAN_PRICING,
  type StudioPlanKey,
  type StudioPlanPricingConfig,
} from "@/lib/studio-plan-pricing";

const ADMIN_KEY_STUDIO_PLAN_PRICING = "studio_plan_pricing_v1";
const ADMIN_KEY_TIER_COMMISSION_MATRIX = "studio_tier_commission_bps_v1";

export type TierCommissionMatrix = Record<StudioPlanKey, { productBps: number; bookingBps: number }>;

export const DEFAULT_TIER_COMMISSION_MATRIX: TierCommissionMatrix = {
  bookings: { productBps: DEFAULT_PLATFORM_COMMISSION_BPS, bookingBps: DEFAULT_PLATFORM_COMMISSION_BPS },
  shop: { productBps: DEFAULT_PLATFORM_COMMISSION_BPS, bookingBps: DEFAULT_PLATFORM_COMMISSION_BPS },
  both: { productBps: DEFAULT_PLATFORM_COMMISSION_BPS, bookingBps: DEFAULT_PLATFORM_COMMISSION_BPS },
  pro: { productBps: DEFAULT_PLATFORM_COMMISSION_BPS, bookingBps: DEFAULT_PLATFORM_COMMISSION_BPS },
};

function parseBps(raw: unknown, fallback: number): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.min(10_000, Math.round(raw)));
  if (typeof raw === "string") {
    const parsed = parseInt(raw.trim(), 10);
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(10_000, parsed));
  }
  return fallback;
}

function parseCents(raw: unknown, fallback: number): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.round(raw));
  if (typeof raw === "string") {
    const parsed = parseInt(raw.trim(), 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return fallback;
}

export async function resolveStudioPlanPricingConfig(): Promise<StudioPlanPricingConfig> {
  try {
    const row = await prisma.adminConfig.findUnique({
      where: { configKey: ADMIN_KEY_STUDIO_PLAN_PRICING },
      select: { configValue: true },
    });
    const raw = (row?.configValue as Partial<Record<StudioPlanKey, Partial<StudioPlanPricingConfig[StudioPlanKey]>>>) ?? {};
    return {
      bookings: {
        monthlyCents: parseCents(raw.bookings?.monthlyCents, DEFAULT_STUDIO_PLAN_PRICING.bookings.monthlyCents),
        annualMonthlyEquivalentCents: parseCents(
          raw.bookings?.annualMonthlyEquivalentCents,
          DEFAULT_STUDIO_PLAN_PRICING.bookings.annualMonthlyEquivalentCents,
        ),
      },
      shop: {
        monthlyCents: parseCents(raw.shop?.monthlyCents, DEFAULT_STUDIO_PLAN_PRICING.shop.monthlyCents),
        annualMonthlyEquivalentCents: parseCents(
          raw.shop?.annualMonthlyEquivalentCents,
          DEFAULT_STUDIO_PLAN_PRICING.shop.annualMonthlyEquivalentCents,
        ),
      },
      both: {
        monthlyCents: parseCents(raw.both?.monthlyCents, DEFAULT_STUDIO_PLAN_PRICING.both.monthlyCents),
        annualMonthlyEquivalentCents: parseCents(
          raw.both?.annualMonthlyEquivalentCents,
          DEFAULT_STUDIO_PLAN_PRICING.both.annualMonthlyEquivalentCents,
        ),
      },
      pro: {
        monthlyCents: parseCents(raw.pro?.monthlyCents, DEFAULT_STUDIO_PLAN_PRICING.pro.monthlyCents),
        annualMonthlyEquivalentCents: parseCents(
          raw.pro?.annualMonthlyEquivalentCents,
          DEFAULT_STUDIO_PLAN_PRICING.pro.annualMonthlyEquivalentCents,
        ),
      },
    };
  } catch {
    return DEFAULT_STUDIO_PLAN_PRICING;
  }
}

export async function saveStudioPlanPricingConfig(value: StudioPlanPricingConfig): Promise<void> {
  await prisma.adminConfig.upsert({
    where: { configKey: ADMIN_KEY_STUDIO_PLAN_PRICING },
    create: { configKey: ADMIN_KEY_STUDIO_PLAN_PRICING, configValue: value },
    update: { configValue: value },
  });
}

export async function resolveTierCommissionMatrix(): Promise<TierCommissionMatrix> {
  try {
    const row = await prisma.adminConfig.findUnique({
      where: { configKey: ADMIN_KEY_TIER_COMMISSION_MATRIX },
      select: { configValue: true },
    });
    const raw = (row?.configValue as Partial<Record<StudioPlanKey, Partial<TierCommissionMatrix[StudioPlanKey]>>>) ?? {};
    return {
      bookings: {
        productBps: parseBps(raw.bookings?.productBps, DEFAULT_TIER_COMMISSION_MATRIX.bookings.productBps),
        bookingBps: parseBps(raw.bookings?.bookingBps, DEFAULT_TIER_COMMISSION_MATRIX.bookings.bookingBps),
      },
      shop: {
        productBps: parseBps(raw.shop?.productBps, DEFAULT_TIER_COMMISSION_MATRIX.shop.productBps),
        bookingBps: parseBps(raw.shop?.bookingBps, DEFAULT_TIER_COMMISSION_MATRIX.shop.bookingBps),
      },
      both: {
        productBps: parseBps(raw.both?.productBps, DEFAULT_TIER_COMMISSION_MATRIX.both.productBps),
        bookingBps: parseBps(raw.both?.bookingBps, DEFAULT_TIER_COMMISSION_MATRIX.both.bookingBps),
      },
      pro: {
        productBps: parseBps(raw.pro?.productBps, DEFAULT_TIER_COMMISSION_MATRIX.pro.productBps),
        bookingBps: parseBps(raw.pro?.bookingBps, DEFAULT_TIER_COMMISSION_MATRIX.pro.bookingBps),
      },
    };
  } catch {
    return DEFAULT_TIER_COMMISSION_MATRIX;
  }
}

export async function saveTierCommissionMatrix(value: TierCommissionMatrix): Promise<void> {
  await prisma.adminConfig.upsert({
    where: { configKey: ADMIN_KEY_TIER_COMMISSION_MATRIX },
    create: { configKey: ADMIN_KEY_TIER_COMMISSION_MATRIX, configValue: value },
    update: { configValue: value },
  });
}

type StudioPlanKeyCarrier = {
  planKey?: StudioPlanKey | null;
  businessTemplateSlug?: string | null;
};

export function inferStudioPlanKey(input: StudioPlanKeyCarrier): StudioPlanKey | null {
  if (input.planKey) return input.planKey;
  const slug = input.businessTemplateSlug?.toLowerCase() ?? "";
  if (!slug) return null;
  if (slug.includes("pro")) return "pro";
  if (slug.includes("book")) return "bookings";
  if (slug.includes("shop")) return "shop";
  return "both";
}

export async function resolveStudioPlanKeyByStudioId(studioId: string): Promise<StudioPlanKey | null> {
  try {
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: { planKey: true, businessTemplateSlug: true },
    });
    if (!studio) return null;
    return inferStudioPlanKey(studio);
  } catch {
    return null;
  }
}

export async function getStudioPlanCommissionLabelMap(): Promise<Record<StudioPlanKey, string>> {
  const matrix = await resolveTierCommissionMatrix();
  return {
    bookings: tierPlatformCommissionIncludeLine(matrix.bookings.productBps, matrix.bookings.bookingBps),
    shop: tierPlatformCommissionIncludeLine(matrix.shop.productBps, matrix.shop.bookingBps),
    both: tierPlatformCommissionIncludeLine(matrix.both.productBps, matrix.both.bookingBps),
    pro: tierPlatformCommissionIncludeLine(matrix.pro.productBps, matrix.pro.bookingBps),
  };
}

/** Per-tier product/booking % labels for comparison tables. */
export async function getTierCommissionLabelMapByItemType(): Promise<{
  product: Record<StudioPlanKey, string>;
  booking: Record<StudioPlanKey, string>;
}> {
  const matrix = await resolveTierCommissionMatrix();
  const keys: StudioPlanKey[] = ["bookings", "shop", "both", "pro"];
  const product = {} as Record<StudioPlanKey, string>;
  const booking = {} as Record<StudioPlanKey, string>;
  for (const k of keys) {
    const row = matrix[k];
    product[k] = platformCommissionPercentLabel(row.productBps);
    booking[k] = platformCommissionPercentLabel(row.bookingBps);
  }
  return { product, booking };
}
