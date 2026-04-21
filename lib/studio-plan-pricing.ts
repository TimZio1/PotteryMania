import { DEFAULT_PLATFORM_COMMISSION_BPS, tierPlatformCommissionIncludeLine } from "@/lib/commission-defaults";

export type StudioPlanKey = "bookings" | "shop" | "both" | "pro";

export type StudioPlan = {
  key: StudioPlanKey;
  name: string;
  monthlyCents: number;
  annualMonthlyEquivalentCents: number;
  headline: string;
  includes: readonly string[];
  recommended?: boolean;
};

export type StudioPlanPricingOverride = {
  monthlyCents: number;
  annualMonthlyEquivalentCents: number;
};

export type StudioPlanPricingConfig = Record<StudioPlanKey, StudioPlanPricingOverride>;
export type StudioPlanCommissionLabels = Partial<Record<StudioPlanKey, string>>;

/** Fallback commission line when DB labels are unavailable (matches default BPS). */
export const STATIC_TIER_COMMISSION_BULLET = tierPlatformCommissionIncludeLine(
  DEFAULT_PLATFORM_COMMISSION_BPS,
  DEFAULT_PLATFORM_COMMISSION_BPS,
);

const STATIC_COMMISSION_LABELS: StudioPlanCommissionLabels = {
  bookings: STATIC_TIER_COMMISSION_BULLET,
  shop: STATIC_TIER_COMMISSION_BULLET,
  both: STATIC_TIER_COMMISSION_BULLET,
  pro: STATIC_TIER_COMMISSION_BULLET,
};

export const STUDIO_PLAN_CURRENCY = "EUR";

const BASE_PLANS: (Omit<StudioPlan, "includes"> &
  { baseIncludes: readonly string[] })[] = [
  {
    key: "bookings",
    name: "Bookings",
    monthlyCents: 1900,
    annualMonthlyEquivalentCents: 1600,
    headline: "For studios selling classes only.",
    baseIncludes: ["Class calendar", "Online booking checkout", "Policies and full-class alerts"],
  },
  {
    key: "shop",
    name: "Shop",
    monthlyCents: 1900,
    annualMonthlyEquivalentCents: 1600,
    headline: "For studios selling ceramics only.",
    baseIncludes: ["Studio-owned shop", "Product and stock management", "Shipping zones"],
  },
  {
    key: "both",
    name: "Studio",
    monthlyCents: 2900,
    annualMonthlyEquivalentCents: 2400,
    headline: "Bookings + shop in one website.",
    baseIncludes: ["Everything in Bookings + Shop", "Unified dashboard", "Branding controls"],
    recommended: true,
  },
  {
    key: "pro",
    name: "Studio Pro",
    monthlyCents: 5900,
    annualMonthlyEquivalentCents: 4900,
    headline: "For growing studios with team workflows.",
    baseIncludes: ["Advanced analytics", "Automation add-ons", "Priority support"],
  },
];

export const DEFAULT_STUDIO_PLAN_PRICING: StudioPlanPricingConfig = {
  bookings: { monthlyCents: 1900, annualMonthlyEquivalentCents: 1600 },
  shop: { monthlyCents: 1900, annualMonthlyEquivalentCents: 1600 },
  both: { monthlyCents: 2900, annualMonthlyEquivalentCents: 2400 },
  pro: { monthlyCents: 5900, annualMonthlyEquivalentCents: 4900 },
};

/** Build plans with the dynamic commission label injected. */
export function buildStudioPlans(
  commissionLabel: string | StudioPlanCommissionLabels,
  pricingOverrides?: Partial<StudioPlanPricingConfig>,
): StudioPlan[] {
  const commissionLabelsByPlan: StudioPlanCommissionLabels =
    typeof commissionLabel === "string"
      ? {
          bookings: commissionLabel,
          shop: commissionLabel,
          both: commissionLabel,
          pro: commissionLabel,
        }
      : commissionLabel;

  return BASE_PLANS.map((p) => ({
    key: p.key,
    name: p.name,
    monthlyCents: pricingOverrides?.[p.key]?.monthlyCents ?? DEFAULT_STUDIO_PLAN_PRICING[p.key].monthlyCents,
    annualMonthlyEquivalentCents:
      pricingOverrides?.[p.key]?.annualMonthlyEquivalentCents ??
      DEFAULT_STUDIO_PLAN_PRICING[p.key].annualMonthlyEquivalentCents,
    headline: p.headline,
    includes: [...p.baseIncludes, commissionLabelsByPlan[p.key] ?? STATIC_TIER_COMMISSION_BULLET],
    ...(p.recommended ? { recommended: true } : {}),
  }));
}

/** Fallback for static/build-time contexts where DB is unavailable. */
export const STUDIO_PLANS: readonly StudioPlan[] = buildStudioPlans(STATIC_COMMISSION_LABELS);

export function euroFromCents(cents: number): string {
  return `€${Math.floor(cents / 100)}`;
}

export function monthlyLabel(plan: Pick<StudioPlan, "monthlyCents">): string {
  return `${euroFromCents(plan.monthlyCents)}/month`;
}

export function annualEquivalentLabel(plan: Pick<StudioPlan, "annualMonthlyEquivalentCents">): string {
  return `${euroFromCents(plan.annualMonthlyEquivalentCents)}/month billed yearly`;
}

export function setupPathToPlanKey(setupPath: "bookings" | "shop" | "both"): StudioPlanKey {
  return setupPath;
}

export function studioPlanByKey(
  key: StudioPlanKey,
  pricingOverrides?: Partial<StudioPlanPricingConfig>,
  /** When loaded from `/api/public/studio-plan-pricing`, overrides static commission bullets per tier. */
  commissionLabels?: StudioPlanCommissionLabels,
): StudioPlan {
  const labels = commissionLabels ? { ...STATIC_COMMISSION_LABELS, ...commissionLabels } : STATIC_COMMISSION_LABELS;
  const source = buildStudioPlans(labels, pricingOverrides);
  const plan = source.find((p) => p.key === key);
  if (!plan) return source[2] ?? STUDIO_PLANS[2];
  return plan;
}
