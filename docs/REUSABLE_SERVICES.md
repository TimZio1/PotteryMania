# Reusable service interfaces (from plugin logic)

TypeScript-facing contracts to implement under `lib/services/`.

## Commission

```ts
export type CommissionItemType = "product" | "booking";

export interface EffectiveCommissionRule {
  percentageBasisPoints: number;
  ruleScope: "global" | "vendor";
  studioId: string | null;
}

export interface CommissionService {
  resolveRule(studioId: string, itemType: CommissionItemType): Promise<EffectiveCommissionRule>;
  /** Line total after discounts, pre-tax; returns commission in cents */
  computeCommissionCents(lineTotalCents: number, rule: EffectiveCommissionRule): number;
}
```

## Payouts (later)

```ts
export interface PayoutService {
  getAvailableBalanceCents(studioId: string): Promise<number>;
  requestPayout(studioId: string): Promise<{ payoutId: string }>;
}
```

## Entitlements

```ts
export interface EntitlementService {
  studioHasFeature(studioId: string, featureKey: string): Promise<boolean>;
}
```

## Email

```ts
export interface EmailService {
  sendPlatform(to: string, template: string, data: Record<string, unknown>): Promise<void>;
  /** Phase 3+: studio SMTP or Resend domain */
  sendForStudio(studioId: string, to: string, template: string, data: Record<string, unknown>): Promise<void>;
}
```

These are **specs**; implementations come with Phase 1–3 features.
