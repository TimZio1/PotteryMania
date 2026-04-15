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

/** Build plans with the dynamic commission label injected. */
export function buildStudioPlans(commissionLabel: string): StudioPlan[] {
  return BASE_PLANS.map((p) => ({
    key: p.key,
    name: p.name,
    monthlyCents: p.monthlyCents,
    annualMonthlyEquivalentCents: p.annualMonthlyEquivalentCents,
    headline: p.headline,
    includes: [...p.baseIncludes, `${commissionLabel} platform commission`],
    ...(p.recommended ? { recommended: true } : {}),
  }));
}

/** Fallback for static/build-time contexts where DB is unavailable. */
export const STUDIO_PLANS: readonly StudioPlan[] = buildStudioPlans("0%");

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

export function studioPlanByKey(key: StudioPlanKey): StudioPlan {
  const plan = STUDIO_PLANS.find((p) => p.key === key);
  if (!plan) return STUDIO_PLANS[2];
  return plan;
}
