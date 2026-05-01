import { prisma } from "@/lib/db";
import type { SpreadconnectCatalogSyncResult } from "@/lib/wear-spreadconnect-catalog-sync";

/** admin_configs.config_key — JSON values are string primitives unless noted */
export const WEAR_SYNC_CONFIG = {
  lastSyncAt: "wear_catalog_last_sync_at",
  lastSyncMode: "wear_catalog_last_sync_mode",
  lastFullSyncAt: "wear_catalog_last_full_sync_at",
  lastPartialSyncAt: "wear_catalog_last_partial_sync_at",
  lastResultJson: "wear_catalog_last_sync_result_json",
  lastError: "wear_catalog_last_sync_error",
  lastFailedAt: "wear_catalog_last_sync_failed_at",
} as const;

function isoNow() {
  return new Date().toISOString();
}

/**
 * Persists successful sync metadata for trust computation and admin UI.
 * Call after every successful `syncSpreadconnectCatalogToWearProducts`.
 */
export async function recordWearCatalogSyncSuccess(result: SpreadconnectCatalogSyncResult): Promise<void> {
  const now = isoNow();
  const summary = {
    fetchedArticles: result.fetchedArticles,
    skippedArticles: result.skippedArticles,
    skipRatio: result.skipRatio,
    syncMode: result.syncMode,
    fullCatalogScanCompleted: result.fullCatalogScanCompleted,
    createdProducts: result.createdProducts,
    updatedProducts: result.updatedProducts,
    syncedProducts: result.syncedProducts,
    archivedProducts: result.archivedProducts,
    archivedDeletedSpreadconnectArticles: result.archivedDeletedSpreadconnectArticles,
    archivedNotInRemoteCatalogSnapshot: result.archivedNotInRemoteCatalogSnapshot,
  };

  await prisma.$transaction([
    prisma.adminConfig.upsert({
      where: { configKey: WEAR_SYNC_CONFIG.lastSyncAt },
      create: { configKey: WEAR_SYNC_CONFIG.lastSyncAt, configValue: now },
      update: { configValue: now },
    }),
    prisma.adminConfig.upsert({
      where: { configKey: WEAR_SYNC_CONFIG.lastSyncMode },
      create: { configKey: WEAR_SYNC_CONFIG.lastSyncMode, configValue: result.syncMode },
      update: { configValue: result.syncMode },
    }),
    prisma.adminConfig.upsert({
      where: { configKey: WEAR_SYNC_CONFIG.lastResultJson },
      create: { configKey: WEAR_SYNC_CONFIG.lastResultJson, configValue: summary },
      update: { configValue: summary },
    }),
    prisma.adminConfig.upsert({
      where: { configKey: WEAR_SYNC_CONFIG.lastError },
      create: { configKey: WEAR_SYNC_CONFIG.lastError, configValue: "" },
      update: { configValue: "" },
    }),
    prisma.adminConfig.upsert({
      where: { configKey: WEAR_SYNC_CONFIG.lastFailedAt },
      create: { configKey: WEAR_SYNC_CONFIG.lastFailedAt, configValue: "" },
      update: { configValue: "" },
    }),
    ...(result.syncMode === "full"
      ? [
          prisma.adminConfig.upsert({
            where: { configKey: WEAR_SYNC_CONFIG.lastFullSyncAt },
            create: { configKey: WEAR_SYNC_CONFIG.lastFullSyncAt, configValue: now },
            update: { configValue: now },
          }),
        ]
      : [
          prisma.adminConfig.upsert({
            where: { configKey: WEAR_SYNC_CONFIG.lastPartialSyncAt },
            create: { configKey: WEAR_SYNC_CONFIG.lastPartialSyncAt, configValue: now },
            update: { configValue: now },
          }),
        ]),
  ]);
}

export async function recordWearCatalogSyncFailure(errorMessage: string): Promise<void> {
  const now = isoNow();
  await prisma.$transaction([
    prisma.adminConfig.upsert({
      where: { configKey: WEAR_SYNC_CONFIG.lastError },
      create: { configKey: WEAR_SYNC_CONFIG.lastError, configValue: errorMessage.slice(0, 2000) },
      update: { configValue: errorMessage.slice(0, 2000) },
    }),
    prisma.adminConfig.upsert({
      where: { configKey: WEAR_SYNC_CONFIG.lastFailedAt },
      create: { configKey: WEAR_SYNC_CONFIG.lastFailedAt, configValue: now },
      update: { configValue: now },
    }),
  ]);
}

export type WearSyncTimestamps = {
  lastSyncAt: Date | null;
  lastFullSyncAt: Date | null;
  lastPartialSyncAt: Date | null;
  lastSyncMode: string | null;
  lastError: string | null;
  lastFailedAt: Date | null;
  lastResultSummary: {
    skipRatio?: number;
    skippedArticles?: number;
    fetchedArticles?: number;
    syncMode?: string;
  } | null;
};

export async function getWearSyncTimestamps(): Promise<WearSyncTimestamps> {
  const keys = [
    WEAR_SYNC_CONFIG.lastSyncAt,
    WEAR_SYNC_CONFIG.lastFullSyncAt,
    WEAR_SYNC_CONFIG.lastPartialSyncAt,
    WEAR_SYNC_CONFIG.lastSyncMode,
    WEAR_SYNC_CONFIG.lastError,
    WEAR_SYNC_CONFIG.lastFailedAt,
    WEAR_SYNC_CONFIG.lastResultJson,
  ];
  const rows = await prisma.adminConfig.findMany({
    where: { configKey: { in: keys } },
    select: { configKey: true, configValue: true },
  });
  const map = new Map(rows.map((r) => [r.configKey, r.configValue]));

  const parseDate = (v: unknown): Date | null => {
    if (typeof v !== "string") return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const lastResultRaw = map.get(WEAR_SYNC_CONFIG.lastResultJson);
  const lastResultSummary =
    lastResultRaw && typeof lastResultRaw === "object" && lastResultRaw !== null && !Array.isArray(lastResultRaw)
      ? (lastResultRaw as WearSyncTimestamps["lastResultSummary"])
      : null;

  const failedRaw = map.get(WEAR_SYNC_CONFIG.lastFailedAt);

  return {
    lastSyncAt: parseDate(map.get(WEAR_SYNC_CONFIG.lastSyncAt)),
    lastFullSyncAt: parseDate(map.get(WEAR_SYNC_CONFIG.lastFullSyncAt)),
    lastPartialSyncAt: parseDate(map.get(WEAR_SYNC_CONFIG.lastPartialSyncAt)),
    lastSyncMode: typeof map.get(WEAR_SYNC_CONFIG.lastSyncMode) === "string" ? map.get(WEAR_SYNC_CONFIG.lastSyncMode) as string : null,
    lastError: (() => {
      const e = map.get(WEAR_SYNC_CONFIG.lastError);
      return typeof e === "string" && e.length > 0 ? e : null;
    })(),
    lastFailedAt:
      typeof failedRaw === "string" && failedRaw.length > 0 ? parseDate(failedRaw) : null,
    lastResultSummary,
  };
}
