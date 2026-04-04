/**
 * Google Analytics 4 — public IDs for admin surfaces and deep links.
 * NEXT_PUBLIC_GA_ID: Measurement ID (e.g. G-XXXXXXXXXX) — required for site tag + display.
 * NEXT_PUBLIC_GA4_PROPERTY_ID: Numeric property ID from GA Admin → Property settings — enables report deep links.
 * NEXT_PUBLIC_GA_STREAM_LABEL: Optional display label (e.g. stream name).
 */

export function getGaMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim();
  return id || undefined;
}

export function getGa4PropertyId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA4_PROPERTY_ID?.trim();
  if (!id || !/^\d+$/.test(id)) return undefined;
  return id;
}

export function getGaStreamLabel(): string | undefined {
  const s = process.env.NEXT_PUBLIC_GA_STREAM_LABEL?.trim();
  return s || undefined;
}

export function ga4ReportUrl(propertyId: string, path: string): string {
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `https://analytics.google.com/analytics/web/#/p${propertyId}/reports/${p}`;
}
