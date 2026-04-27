import { prisma } from "@/lib/db";
import { getSpreadconnectConfig } from "@/lib/spreadconnect-config";
import { wearPublicProductWhere } from "@/lib/wear-public-filter";
import { findDuplicateWearVariantSkus } from "@/lib/wear-sku-integrity";
import { computeCatalogTrustState } from "@/lib/wear-catalog-trust";
import { getWearSyncTimestamps } from "@/lib/wear-catalog-sync-state";
import { computeInternalCatalogHealthScore } from "@/lib/wear-internal-health-score";

const SC_FAIL = "wear_spreadconnect_failed";
const SC_OK = "wear_spreadconnect_submitted";

export function isKnownWearImageHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "images.unsplash.com") return true;
  if (h.endsWith(".spreadshirtmedia.net")) return true;
  return false;
}

/** Hosts on product images not covered by `next.config.ts` remotePatterns (post-sync / ops checklist). */
export async function listUnknownWearImageHostsForActiveCatalog(): Promise<string[]> {
  const products = await prisma.wearProduct.findMany({
    where: { isActive: true, archivedAt: null },
    select: { images: true },
  });
  const unknown = new Set<string>();
  for (const p of products) {
    const arr = Array.isArray(p.images) ? p.images : [];
    for (const x of arr) {
      if (typeof x !== "string" || !x.startsWith("http")) continue;
      try {
        const h = new URL(x).hostname;
        if (!isKnownWearImageHost(h)) unknown.add(h.toLowerCase());
      } catch {
        /* invalid URL */
      }
    }
  }
  return [...unknown].sort();
}

/**
 * Same filter as `/wear/shop` and `GET /api/wear/products`.
 */
export async function getWearCatalogHealthSnapshot() {
  const [
    shopVisibleCount,
    syncedShopVisibleCount,
    totalProducts,
    archivedCount,
    inactiveCount,
    visibleSample,
    spreadconnectFailures24h,
    spreadconnectSuccess24h,
    duplicateSkuGroups,
    publishedReadyCount,
  ] = await Promise.all([
    prisma.wearProduct.count({ where: wearPublicProductWhere() }),
    prisma.wearProduct.count({
      where: {
        AND: [
          wearPublicProductWhere(),
          {
            OR: [{ spreadconnectArticleId: { not: null } }, { externalFulfillmentId: { not: null } }],
          },
        ],
      },
    }),
    prisma.wearProduct.count(),
    prisma.wearProduct.count({ where: { archivedAt: { not: null } } }),
    prisma.wearProduct.count({ where: { isActive: false } }),
    prisma.wearProduct.findMany({
      where: wearPublicProductWhere(),
      select: { slug: true, name: true, isFeatured: true },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      take: 24,
    }),
    prisma.wearAnalyticsEvent.count({
      where: {
        kind: SC_FAIL,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.wearAnalyticsEvent.count({
      where: {
        kind: SC_OK,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    findDuplicateWearVariantSkus(),
    prisma.wearProduct.count({
      where: {
        publishStatus: "published",
        assetHealthStatus: "ready",
        isActive: true,
        archivedAt: null,
      },
    }),
  ]);

  const [catalogTrust, syncTimestamps] = await Promise.all([
    computeCatalogTrustState({ duplicateSkuGroups }),
    getWearSyncTimestamps(),
  ]);

  const publishedReadyButNotPublicEligibleCount = Math.max(0, publishedReadyCount - shopVisibleCount);

  const rawKey = process.env.SPREADCONNECT_API_KEY?.trim() ?? "";
  const spreadconnectPendingPlaceholder = rawKey === "__PENDING__";
  const spreadconnectConfigured = getSpreadconnectConfig() !== null;
  const spreadconnectWarning = spreadconnectPendingPlaceholder
    ? "API key is __PENDING__ (catalog sync and paid order submit disabled)"
    : !rawKey
      ? "SPREADCONNECT_API_KEY is not set (catalog sync and paid order submit disabled)"
      : null;

  let catalogImportHint: string | null = null;
  if (shopVisibleCount > 0 && syncedShopVisibleCount === 0) {
    if (!spreadconnectConfigured) {
      catalogImportHint =
        "The public shop is showing the saved database catalog. Set a real SPREADCONNECT_API_KEY on the host for the scheduled catalog cron; admin pages do not run real-time Spreadconnect catalog sync.";
    } else {
      catalogImportHint =
        "Spreadconnect is configured, but the live shop has no imported catalog rows yet (no products with variant SKUs or an external fulfillment id). Let the scheduled catalog cron refresh saved DB data; admin pages intentionally do not run real-time Spreadconnect catalog fetches.";
    }
  }

  let emptyDiagnosis: string | null = null;
  if (shopVisibleCount === 0) {
    if (totalProducts === 0) {
      emptyDiagnosis =
        "No rows in wear_products for this DATABASE_URL. Apply migrations (includes seed migration 20260423100000_wear_catalog_seed_data) or run prisma db seed.";
    } else {
      emptyDiagnosis =
        "Products exist but none match /wear/shop filter (is_active=true AND archived_at IS NULL). Reactivate or unarchive in /admin/wear-products.";
    }
  }

  const productsWithImages = await prisma.wearProduct.findMany({
    where: wearPublicProductWhere(),
    select: { id: true, images: true },
    take: 40,
  });

  const unknownImageHosts = new Set<string>();
  const brokenImages: { productId: string; url: string; status: number | string }[] = [];

  for (const p of productsWithImages) {
    const arr = Array.isArray(p.images) ? p.images : [];
    const first = arr.find((x) => typeof x === "string" && x.startsWith("http"));
    if (typeof first !== "string") continue;
    try {
      const u = new URL(first);
      if (!isKnownWearImageHost(u.hostname)) unknownImageHosts.add(u.hostname);
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 4000);
      const res = await fetch(first, { method: "HEAD", signal: ac.signal, redirect: "follow" }).catch(() => null);
      clearTimeout(to);
      const st = res?.status ?? "fetch_error";
      if (!res || !res.ok) brokenImages.push({ productId: p.id, url: first.slice(0, 240), status: st });
    } catch {
      brokenImages.push({ productId: p.id, url: first.slice(0, 240), status: "bad_url" });
    }
  }

  const internalHealthScore = computeInternalCatalogHealthScore({
    catalogTrustState: catalogTrust.catalogTrustState,
    duplicateSkuGroupCount: duplicateSkuGroups.length,
    publishedReadyButNotPublicEligibleCount,
    spreadconnectFailures24h: spreadconnectFailures24h,
    brokenImageSampleCount: brokenImages.length,
  });

  return {
    shopVisibleCount,
    syncedShopVisibleCount,
    publishedReadyCount,
    publishedReadyButNotPublicEligibleCount,
    catalogTrustState: catalogTrust.catalogTrustState,
    catalogTrustReasons: catalogTrust.catalogTrustReasons,
    lastSyncAt: syncTimestamps.lastSyncAt?.toISOString() ?? null,
    lastFullSyncAt: syncTimestamps.lastFullSyncAt?.toISOString() ?? null,
    lastPartialSyncAt: syncTimestamps.lastPartialSyncAt?.toISOString() ?? null,
    lastSyncMode: syncTimestamps.lastSyncMode,
    lastSyncSkipRatio: syncTimestamps.lastResultSummary?.skipRatio ?? null,
    lastSyncError: syncTimestamps.lastError,
    internalHealthScore,
    totalProducts,
    archivedCount,
    inactiveCount,
    visibleSlugs: visibleSample.map((p) => p.slug),
    visibleSample: visibleSample.map((p) => ({ slug: p.slug, name: p.name, featured: p.isFeatured })),
    spreadconnectConfigured,
    spreadconnectWarning,
    catalogImportHint,
    spreadconnectFailuresLast24h: spreadconnectFailures24h,
    spreadconnectSubmissionsLast24h: spreadconnectSuccess24h,
    duplicateSkuGroupCount: duplicateSkuGroups.length,
    duplicateSkuSamples: duplicateSkuGroups.slice(0, 12).map((d) => d.sku),
    unknownImageHosts: [...unknownImageHosts].sort(),
    brokenImages,
    emptyDiagnosis,
    checklist: {
      sameQueryAsPublicShop: true /** matches `wearPublicProductWhere()` used by /wear/shop and APIs */,
      migrateCommand: "npx prisma migrate deploy",
      catalogMigrationId: "20260423100000_wear_catalog_seed_data",
      imageHostsNote:
        "Add any hosts listed in unknownImageHosts to next.config.ts remotePatterns, then redeploy.",
    },
  };
}

export type WearCatalogHealthSnapshot = Awaited<ReturnType<typeof getWearCatalogHealthSnapshot>>;

/** Renders degraded panels when Prisma, sync state, or image probes fail. */
export function wearCatalogHealthSnapshotUnavailable(reason: string): WearCatalogHealthSnapshot {
  const rawKey = process.env.SPREADCONNECT_API_KEY?.trim() ?? "";
  const spreadconnectPendingPlaceholder = rawKey === "__PENDING__";
  const spreadconnectConfigured = getSpreadconnectConfig() !== null;
  const spreadconnectWarning = spreadconnectPendingPlaceholder
    ? "API key is __PENDING__ (catalog sync and paid order submit disabled)"
    : !rawKey
      ? "SPREADCONNECT_API_KEY is not set (catalog sync and paid order submit disabled)"
      : null;

  return {
    shopVisibleCount: 0,
    syncedShopVisibleCount: 0,
    publishedReadyCount: 0,
    publishedReadyButNotPublicEligibleCount: 0,
    catalogTrustState: "FAILED",
    catalogTrustReasons: [
      `Could not compute catalog health (operators can still manage products below). ${reason}`,
    ],
    lastSyncAt: null,
    lastFullSyncAt: null,
    lastPartialSyncAt: null,
    lastSyncMode: null,
    lastSyncSkipRatio: null,
    lastSyncError: reason,
    internalHealthScore: 0,
    totalProducts: 0,
    archivedCount: 0,
    inactiveCount: 0,
    visibleSlugs: [],
    visibleSample: [],
    spreadconnectConfigured,
    spreadconnectWarning,
    catalogImportHint: null,
    spreadconnectFailuresLast24h: 0,
    spreadconnectSubmissionsLast24h: 0,
    duplicateSkuGroupCount: 0,
    duplicateSkuSamples: [],
    unknownImageHosts: [],
    brokenImages: [],
    emptyDiagnosis: reason,
    checklist: {
      sameQueryAsPublicShop: true,
      migrateCommand: "npx prisma migrate deploy",
      catalogMigrationId: "20260423100000_wear_catalog_seed_data",
      imageHostsNote:
        "Add any hosts listed in unknownImageHosts to next.config.ts remotePatterns, then redeploy.",
    },
  };
}

export async function loadWearCatalogHealthSnapshot(): Promise<{
  snapshot: WearCatalogHealthSnapshot;
  error: string | null;
}> {
  try {
    const snapshot = await getWearCatalogHealthSnapshot();
    return { snapshot, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[wear-catalog-health] getWearCatalogHealthSnapshot failed", err);
    return { snapshot: wearCatalogHealthSnapshotUnavailable(msg), error: msg };
  }
}
