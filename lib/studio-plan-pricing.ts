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

export const STUDIO_PLANS: readonly StudioPlan[] = [
  {
    key: "bookings",
    name: "Bookings",
    monthlyCents: 1900,
    annualMonthlyEquivalentCents: 1600,
    headline: "For studios selling classes only.",
    includes: ["Class calendar", "Online booking checkout", "Policies and waitlist", "0% platform commission"],
  },
  {
    key: "shop",
    name: "Shop",
    monthlyCents: 1900,
    annualMonthlyEquivalentCents: 1600,
    headline: "For studios selling ceramics only.",
    includes: ["Studio-owned shop", "Product and stock management", "Shipping zones", "0% platform commission"],
  },
  {
    key: "both",
    name: "Studio",
    monthlyCents: 2900,
    annualMonthlyEquivalentCents: 2400,
    headline: "Bookings + shop in one website.",
    includes: ["Everything in Bookings + Shop", "Unified dashboard", "Branding controls", "0% platform commission"],
    recommended: true,
  },
  {
    key: "pro",
    name: "Studio Pro",
    monthlyCents: 5900,
    annualMonthlyEquivalentCents: 4900,
    headline: "For growing studios with team workflows.",
    includes: ["Advanced analytics", "Automation add-ons", "Priority support", "0% platform commission"],
  },
] as const;

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
