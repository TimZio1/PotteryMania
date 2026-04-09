export const OFFERING_PRICING_TYPES = ["one_time", "recurring"] as const;
export type OfferingPricingTypeValue = (typeof OFFERING_PRICING_TYPES)[number];

export const OFFERING_BILLING_INTERVALS = ["weekly", "monthly", "custom"] as const;
export type OfferingBillingIntervalValue = (typeof OFFERING_BILLING_INTERVALS)[number];

export const OFFERING_FAILED_PAYMENT_ACTIONS = ["pause", "cancel"] as const;
export type OfferingFailedPaymentActionValue = (typeof OFFERING_FAILED_PAYMENT_ACTIONS)[number];

export type OfferingPricingInput = {
  pricingType?: unknown;
  recurringPriceCents?: unknown;
  billingInterval?: unknown;
  billingIntervalCount?: unknown;
  minimumCommitmentCycles?: unknown;
  autoRenew?: unknown;
  trialPeriodDays?: unknown;
  cancellationPolicyText?: unknown;
  gracePeriodDays?: unknown;
  paymentRetryMax?: unknown;
  failedPaymentAction?: unknown;
};

export type NormalizedOfferingPricing = {
  pricingType: OfferingPricingTypeValue;
  recurringPriceCents: number | null;
  billingInterval: OfferingBillingIntervalValue | null;
  billingIntervalCount: number | null;
  minimumCommitmentCycles: number | null;
  autoRenew: boolean;
  trialPeriodDays: number | null;
  cancellationPolicyText: string | null;
  gracePeriodDays: number;
  paymentRetryMax: number;
  failedPaymentAction: OfferingFailedPaymentActionValue;
};

export function isOfferingPricingType(v: unknown): v is OfferingPricingTypeValue {
  return typeof v === "string" && OFFERING_PRICING_TYPES.includes(v as OfferingPricingTypeValue);
}

export function isOfferingBillingInterval(v: unknown): v is OfferingBillingIntervalValue {
  return typeof v === "string" && OFFERING_BILLING_INTERVALS.includes(v as OfferingBillingIntervalValue);
}

export function isOfferingFailedPaymentAction(v: unknown): v is OfferingFailedPaymentActionValue {
  return typeof v === "string" && OFFERING_FAILED_PAYMENT_ACTIONS.includes(v as OfferingFailedPaymentActionValue);
}

function toInt(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.floor(v);
}

export function normalizeOfferingPricing(input: OfferingPricingInput): {
  ok: true;
  value: NormalizedOfferingPricing;
} | { ok: false; error: string } {
  const pricingType = isOfferingPricingType(input.pricingType) ? input.pricingType : "one_time";
  const recurringPriceCentsRaw = toInt(input.recurringPriceCents);
  const billingInterval = isOfferingBillingInterval(input.billingInterval) ? input.billingInterval : null;
  const billingIntervalCountRaw = toInt(input.billingIntervalCount);
  const minimumCommitmentCyclesRaw = toInt(input.minimumCommitmentCycles);
  const trialPeriodDaysRaw = toInt(input.trialPeriodDays);
  const gracePeriodDaysRaw = toInt(input.gracePeriodDays);
  const paymentRetryMaxRaw = toInt(input.paymentRetryMax);
  const failedPaymentAction = isOfferingFailedPaymentAction(input.failedPaymentAction)
    ? input.failedPaymentAction
    : "pause";
  const autoRenew = input.autoRenew !== false;
  const cancellationPolicyText =
    typeof input.cancellationPolicyText === "string" ? input.cancellationPolicyText.trim() || null : null;

  const value: NormalizedOfferingPricing = {
    pricingType,
    recurringPriceCents: null,
    billingInterval: null,
    billingIntervalCount: null,
    minimumCommitmentCycles: null,
    autoRenew,
    trialPeriodDays: null,
    cancellationPolicyText,
    gracePeriodDays: 3,
    paymentRetryMax: 3,
    failedPaymentAction,
  };

  if (pricingType === "one_time") {
    return { ok: true, value };
  }

  if (recurringPriceCentsRaw == null || recurringPriceCentsRaw < 50) {
    return { ok: false, error: "Recurring price must be at least 50 cents." };
  }
  if (!billingInterval) {
    return { ok: false, error: "Billing interval is required for recurring offerings." };
  }
  const billingIntervalCount = billingIntervalCountRaw == null ? 1 : billingIntervalCountRaw;
  if (billingIntervalCount < 1 || billingIntervalCount > 52) {
    return { ok: false, error: "Billing interval count must be between 1 and 52." };
  }
  if (minimumCommitmentCyclesRaw != null && (minimumCommitmentCyclesRaw < 1 || minimumCommitmentCyclesRaw > 120)) {
    return { ok: false, error: "Minimum commitment must be between 1 and 120 cycles." };
  }
  if (trialPeriodDaysRaw != null && (trialPeriodDaysRaw < 1 || trialPeriodDaysRaw > 60)) {
    return { ok: false, error: "Trial period must be between 1 and 60 days." };
  }
  const gracePeriodDays = gracePeriodDaysRaw == null ? 3 : gracePeriodDaysRaw;
  if (gracePeriodDays < 0 || gracePeriodDays > 30) {
    return { ok: false, error: "Grace period must be between 0 and 30 days." };
  }
  const paymentRetryMax = paymentRetryMaxRaw == null ? 3 : paymentRetryMaxRaw;
  if (paymentRetryMax < 0 || paymentRetryMax > 12) {
    return { ok: false, error: "Retry attempts must be between 0 and 12." };
  }

  value.recurringPriceCents = recurringPriceCentsRaw;
  value.billingInterval = billingInterval;
  value.billingIntervalCount = billingIntervalCount;
  value.minimumCommitmentCycles = minimumCommitmentCyclesRaw;
  value.trialPeriodDays = trialPeriodDaysRaw;
  value.gracePeriodDays = gracePeriodDays;
  value.paymentRetryMax = paymentRetryMax;
  return { ok: true, value };
}

export function billingIntervalLabel(interval: OfferingBillingIntervalValue, count = 1): string {
  if (interval === "weekly") return count === 1 ? "week" : `${count} weeks`;
  if (interval === "monthly") return count === 1 ? "month" : `${count} months`;
  return count === 1 ? "cycle" : `${count} cycles`;
}
