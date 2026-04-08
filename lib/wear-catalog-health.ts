import { prisma } from "@/lib/db";
import { getSpreadconnectConfig } from "@/lib/spreadconnect-config";

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
  ] = await Promise.all([
    prisma.wearProduct.count({ where: { isActive: true, archivedAt: null } }),
    prisma.wearProduct.count({
      where: {
        isActive: true,
        archivedAt: null,
        OR: [
          { externalFulfillmentId: { not: null } },
          { variants: { some: { isActive: true, sku: { not: null } } } },
        ],
      },
    }),
    prisma.wearProduct.count(),
    prisma.wearProduct.count({ where: { archivedAt: { not: null } } }),
    prisma.wearProduct.count({ where: { isActive: false } }),
    prisma.wearProduct.findMany({
      where: { isActive: true, archivedAt: null },
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
  ]);

  const rawKey = process.env.SPREADCONNECT_API_KEY?.trim() ?? "";
  const spreadconnectPendingPlaceholder = rawKey === "__PENDING__";
  const spreadconnectConfigured = getSpreadconnectConfig() !== null;
  const spreadconnectWarning = spreadconnectPendingPlaceholder
    ? "API key is __PENDING__ (catalog sync and POD submit disabled)"
    : !rawKey
      ? "SPREADCONNECT_API_KEY is not set (catalog sync and POD submit disabled)"
      : null;

  let catalogImportHint: string | null = null;
  if (shopVisibleCount > 0 && syncedShopVisibleCount === 0) {
    if (!spreadconnectConfigured) {
      catalogImportHint =
        "The public shop is still showing the built-in demo catalog from the database, not your Spreadconnect (SPOD) articles. Set a real SPREADCONNECT_API_KEY on the host, redeploy, then click “Sync from Spreadconnect” below. After a successful sync, placeholder products without variant SKUs are archived automatically.";
    } else {
      catalogImportHint =
        "Spreadconnect is configured, but the live shop has no imported catalog rows yet (no products with variant SKUs or an external fulfillment id). Use “Sync Spreadconnect catalog” below (default mode lists only the first page of articles and is gentle on their API). To import a large catalog, either run several syncs, enable “Full catalog scan” once, or raise `SPREADCONNECT_SYNC_DISCOVER_MAX_PAGES` on the server. Articles without images, SKUs, or prices are skipped — check sync counts for “skipped”.";
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
    where: { isActive: true, archivedAt: null },
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

  return {
    shopVisibleCount,
    syncedShopVisibleCount,
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
    unknownImageHosts: [...unknownImageHosts].sort(),
    brokenImages,
    emptyDiagnosis,
    checklist: {
      sameQueryAsPublicShop: true,
      migrateCommand: "npx prisma migrate deploy",
      catalogMigrationId: "20260423100000_wear_catalog_seed_data",
      imageHostsNote:
        "Add any hosts listed in unknownImageHosts to next.config.ts remotePatterns, then redeploy.",
    },
  };
}
