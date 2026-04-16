import type { CatalogTrustState } from "@/lib/wear-catalog-trust";

/**
 * Single operator-facing 0–100 score (not customer-visible).
 * Penalizes trust failures, duplicate SKUs, blocked publish paths, SC failures, broken images.
 */
export function computeInternalCatalogHealthScore(input: {
  catalogTrustState: CatalogTrustState;
  duplicateSkuGroupCount: number;
  publishedReadyButNotPublicEligibleCount: number;
  spreadconnectFailures24h: number;
  brokenImageSampleCount: number;
}): number {
  let s: number;
  switch (input.catalogTrustState) {
    case "FAILED":
      return 0;
    case "UNVERIFIED":
      s = 48;
      break;
    case "DEGRADED":
      s = 64;
      break;
    case "VERIFIED":
      s = 90;
      break;
    default:
      s = 50;
  }

  s -= Math.min(28, input.duplicateSkuGroupCount * 7);
  s -= Math.min(18, input.publishedReadyButNotPublicEligibleCount * 2);
  s -= Math.min(20, input.spreadconnectFailures24h * 4);
  s -= Math.min(12, input.brokenImageSampleCount * 3);

  return Math.max(0, Math.min(100, Math.round(s)));
}
