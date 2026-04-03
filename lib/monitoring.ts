import * as Sentry from "@sentry/nextjs";

let initialized = false;

export function initMonitoring() {
  if (initialized || !process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.2,
    enabled: process.env.NODE_ENV === "production",
  });
  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (process.env.SENTRY_DSN) {
    initMonitoring();
    Sentry.captureException(error, {
      extra: context,
    });
  }
  console.error("[app-error]", error, context ?? {});
}
