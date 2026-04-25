/**
 * Google Analytics 4 — public IDs for admin surfaces and deep links.
 * NEXT_PUBLIC_GA_ID: Measurement ID (e.g. G-XXXXXXXXXX) — optional; falls back in production to the
 * default web stream for potterymania.com (override via env for staging or another property).
 * NEXT_PUBLIC_GA4_PROPERTY_ID: Numeric property ID from GA Admin → Property settings — enables report deep links.
 * NEXT_PUBLIC_GA_STREAM_LABEL: Optional display label (e.g. stream name).
 */
const DEFAULT_GA_MEASUREMENT_ID = "G-J3SSPW322R";

export function getGaMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (id) return id;
  if (process.env.NODE_ENV === "production") {
    return DEFAULT_GA_MEASUREMENT_ID;
  }
  return undefined;
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
