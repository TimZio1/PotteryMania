import { prisma } from "@/lib/db";
import { getSpreadconnectConfig } from "@/lib/spreadconnect-config";

const SC_FAIL = "wear_spreadconnect_failed";
const SC_OK = "wear_spreadconnect_submitted";

/**
 * Same filter as `/wear/shop` and `GET /api/wear/products`.
 */
export async function getWearCatalogHealthSnapshot() {
  const [
    shopVisibleCount,
    totalProducts,
    archivedCount,
    inactiveCount,
    visibleSample,
    spreadconnectFailures24h,
    spreadconnectSuccess24h,
  ] = await Promise.all([
    prisma.wearProduct.count({ where: { isActive: true, archivedAt: null } }),
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

  const spreadconnectConfigured = getSpreadconnectConfig() !== null;

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

  return {
    shopVisibleCount,
    totalProducts,
    archivedCount,
    inactiveCount,
    visibleSlugs: visibleSample.map((p) => p.slug),
    visibleSample: visibleSample.map((p) => ({ slug: p.slug, name: p.name, featured: p.isFeatured })),
    spreadconnectConfigured,
    spreadconnectFailuresLast24h: spreadconnectFailures24h,
    spreadconnectSubmissionsLast24h: spreadconnectSuccess24h,
    emptyDiagnosis,
    checklist: {
      sameQueryAsPublicShop: true,
      migrateCommand: "npx prisma migrate deploy",
      catalogMigrationId: "20260423100000_wear_catalog_seed_data",
    },
  };
}
