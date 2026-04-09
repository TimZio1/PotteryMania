/** Activation fee removed: Stripe-connected auto-activation. */
export const ACTIVATION_FEE_CENTS = 0;

export const LEDGER_SOURCE_SYSTEM = {
  commerce: "commerce",
  stripe: "stripe",
  manual: "manual",
  cron: "cron",
} as const;
