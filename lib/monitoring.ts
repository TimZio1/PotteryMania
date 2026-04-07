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

/** Structured API error logging (Sentry + tag + optional request id). */
export function logApiError(tag: string, error: unknown, context?: Record<string, unknown>, req?: Request) {
  const requestId = req?.headers.get("x-request-id") ?? req?.headers.get("cf-ray") ?? undefined;
  captureError(error, { tag, ...context, requestId });
}
