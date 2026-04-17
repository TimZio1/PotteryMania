import type { WearSkuDuplicateRow } from "@/lib/wear-sku-integrity";
import { findDuplicateWearVariantSkus } from "@/lib/wear-sku-integrity";
import { getWearSyncTimestamps } from "@/lib/wear-catalog-sync-state";

export type CatalogTrustState = "VERIFIED" | "DEGRADED" | "UNVERIFIED" | "FAILED";

const FULL_SYNC_MAX_AGE_MS = 36 * 60 * 60 * 1000;
const SKIP_RATIO_WARN = 0.85;

export type CatalogTrustComputation = {
  catalogTrustState: CatalogTrustState;
  catalogTrustReasons: string[];
};

/**
 * Computes operator-facing catalog trust from persisted sync metadata + live SKU integrity.
 * Not cached — call from health snapshot / admin only.
 */
export async function computeCatalogTrustState(opts?: {
  duplicateSkuGroups?: WearSkuDuplicateRow[];
}): Promise<CatalogTrustComputation> {
  const reasons: string[] = [];
  const sync = await getWearSyncTimestamps();
  const dupes = opts?.duplicateSkuGroups ?? (await findDuplicateWearVariantSkus());

  if (sync.lastError) {
    const errText = String(sync.lastError).slice(0, 200);
    reasons.push(`Last sync error recorded: ${errText}`);
    return { catalogTrustState: "FAILED", catalogTrustReasons: reasons };
  }

  const now = Date.now();
  const lastFull = sync.lastFullSyncAt?.getTime() ?? null;
  const fullFresh = lastFull != null && now - lastFull <= FULL_SYNC_MAX_AGE_MS;

  if (lastFull == null) {
    reasons.push("No successful full discovery sync has been recorded yet (wear_catalog_last_full_sync_at empty).");
    return { catalogTrustState: "UNVERIFIED", catalogTrustReasons: reasons };
  }

  if (!fullFresh) {
    reasons.push(
      `Last full sync is older than ${Math.floor(FULL_SYNC_MAX_AGE_MS / 3600000)}h — catalog completeness is not verified.`,
    );
    return { catalogTrustState: "UNVERIFIED", catalogTrustReasons: reasons };
  }

  const skipRatio = sync.lastResultSummary?.skipRatio;
  const highSkip =
    typeof skipRatio === "number" &&
    sync.lastResultSummary &&
    typeof sync.lastResultSummary.fetchedArticles === "number" &&
    sync.lastResultSummary.fetchedArticles > 5 &&
    skipRatio >= SKIP_RATIO_WARN;

  if (dupes.length > 0) {
    reasons.push(`${dupes.length} duplicate SKU group(s) — fulfillment routing may be ambiguous.`);
  }
  if (highSkip) {
    reasons.push(
      `Last sync skip ratio ${(skipRatio! * 100).toFixed(1)}% meets abnormal threshold (≥${SKIP_RATIO_WARN * 100}%).`,
    );
  }

  if (dupes.length > 0 || highSkip) {
    return { catalogTrustState: "DEGRADED", catalogTrustReasons: reasons };
  }

  reasons.push("Full sync within freshness window; no duplicate SKUs; skip ratio within bounds.");
  return { catalogTrustState: "VERIFIED", catalogTrustReasons: reasons };
}
