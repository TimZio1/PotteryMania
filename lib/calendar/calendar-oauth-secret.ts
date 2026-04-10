/** Minimum length for secrets used to sign OAuth `state` in production. */
const MIN_STRONG_SECRET = 12;

/**
 * Secret used to sign Google Calendar OAuth `state`. Production must not use a guessable default.
 */
export function calendarOAuthStateSecret(): string {
  const explicit = process.env.CALENDAR_OAUTH_SECRET?.trim();
  const cron = process.env.CRON_SECRET?.trim();
  const chosen = explicit && explicit.length >= MIN_STRONG_SECRET ? explicit : cron && cron.length >= MIN_STRONG_SECRET ? cron : null;

  if (process.env.NODE_ENV === "production") {
    if (!chosen) {
      throw new Error(
        `CALENDAR_OAUTH_SECRET (recommended) or CRON_SECRET must be set to at least ${MIN_STRONG_SECRET} characters in production for Google Calendar OAuth state signing.`,
      );
    }
    return chosen;
  }

  if (chosen) return chosen;
  return "dev-calendar-oauth-state";
}

export function assertCalendarOAuthStateSecretForConnect(): void {
  calendarOAuthStateSecret();
}
