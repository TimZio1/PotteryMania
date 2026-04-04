/** One-time studio activation fee (€5) — keep in sync with activate route */
export const ACTIVATION_FEE_CENTS = 500;

export const LEDGER_SOURCE_SYSTEM = {
  commerce: "commerce",
  stripe: "stripe",
  manual: "manual",
  cron: "cron",
} as const;
