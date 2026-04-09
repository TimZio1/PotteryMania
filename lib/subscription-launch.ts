const OFFICIAL_LAUNCH_AT = new Date("2026-05-01T00:00:00Z");

type LaunchTrialInput = {
  trialPeriodDays?: number | null;
  now?: Date;
};

/**
 * Enforce business rule: no subscription charges before official launch.
 * Returns Stripe-compatible trial config using `trial_end` when needed.
 */
export function computeLaunchAwareSubscriptionTrial(input: LaunchTrialInput = {}) {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const launchMs = OFFICIAL_LAUNCH_AT.getTime();

  const trialDays = Math.max(0, Number(input.trialPeriodDays ?? 0));
  const requestedTrialMs = trialDays > 0 ? nowMs + trialDays * 24 * 60 * 60 * 1000 : nowMs;

  const firstChargeMs = Math.max(requestedTrialMs, launchMs);
  if (firstChargeMs <= nowMs + 30_000) return {};

  return { trial_end: Math.floor(firstChargeMs / 1000) };
}

export { OFFICIAL_LAUNCH_AT };
