import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import type { SpreadconnectConfig } from "@/lib/spreadconnect-config";
import { prisma } from "@/lib/db";
import { getSpreadconnectConfig } from "@/lib/spreadconnect-config";
import { normalizeWearSlug } from "@/lib/wear-slug";
import { listUnknownWearImageHostsForActiveCatalog } from "@/lib/wear-catalog-health";
import { wearImagesToJson, type WearCatalogImage } from "@/lib/wear-product-json";

type SpreadconnectArticleVariant = {
  productTypeId?: number | null;
  productTypeName?: string | null;
  sku?: string | null;
  sizeName?: string | null;
  appearanceName?: string | null;
  /** Final price for the customer (Spreadshop direct-to-consumer). */
  d2cPrice?: number | null;
  /** Wholesale / B2B price — what we pay Spreadconnect per unit. Used as our `supplyCostCents` floor. */
  b2bPrice?: number | null;
};

type SpreadconnectArticleImage = {
  id?: number | null;
  appearanceId?: number | null;
  appearanceName?: string | null;
  perspective?: string | null;
  imageUrl?: string | null;
};

type SpreadconnectArticle = {
  id?: number;
  title?: string | null;
  description?: string | null;
  variants?: SpreadconnectArticleVariant[] | null;
  images?: SpreadconnectArticleImage[] | null;
};

type SyncedVariant = {
  sku: string;
  label: string;
  optionSize: string | null;
  optionColor: string | null;
  priceCents: number | null;
  /** Per-variant wholesale cost (cents). Captured for analytics; product-level floor is taken from the min. */
  supplyCostCents: number | null;
  sortOrder: number;
};

type PreparedArticle = {
  articleId: number | null;
  name: string;
  slugBase: string;
  description: string | null;
  images: WearCatalogImage[];
  priceCents: number;
  /** Cheapest b2b price across active variants (cents). Used as `WearProduct.supplyCostCents` floor. */
  supplyCostCents: number | null;
  currency: string;
  externalFulfillmentId: string | null;
  spreadconnectProductTypeId: number | null;
  spreadconnectProductTypeName: string | null;
  spreadconnectCategoryData: Prisma.InputJsonValue | null;
  variants: SyncedVariant[];
};

export type SpreadconnectCatalogSyncOptions = {
  /**
   * List every page of GET /articles until the catalog ends. Heavy — use only when onboarding or reconciling.
   * Default sync refreshes known articles by id and scans only the first discovery page(s).
   */
  fullDiscovery?: boolean;
};

export type SpreadconnectCatalogSyncResult = {
  fetchedArticles: number;
  syncedProducts: number;
  createdProducts: number;
  updatedProducts: number;
  skippedUnchangedProducts: number;
  archivedProducts: number;
  skippedArticles: number;
  syncedVariants: number;
  /** GET /articles/{id} refreshes (excludes discovery-only rows). */
  refreshedByArticleId: number;
  /** GET /articles pages fetched for discovery. */
  discoveryListPages: number;
  /** True when fullDiscovery ran through the end of the list (short/empty last page). */
  fullCatalogScanCompleted: boolean;
  /** Image hostnames not in Next.js `remotePatterns` — add to `next.config.ts` if legitimate. */
  unknownImageHosts: string[];
  /** `full` when full discovery scan is enabled (option or env); otherwise incremental/partial. */
  syncMode: "full" | "partial";
  /** skippedArticles / fetchedArticles (remote rows processed). */
  skipRatio: number;
};

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function labelForVariant(variant: SpreadconnectArticleVariant) {
  const parts = [asString(variant.sizeName), asString(variant.appearanceName)].filter(Boolean);
  return parts.join(" · ") || "Default";
}

function centsFromAmount(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function uniqueHttpsUrls(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const v = value?.trim();
    if (!v || seen.has(v) || !/^https?:\/\//i.test(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function uniqueWearImages(images: WearCatalogImage[]) {
  const seen = new Set<string>();
  const out: WearCatalogImage[] = [];
  for (const image of images) {
    const key = [image.url, image.appearanceName ?? "", image.perspective ?? "", image.imageId ?? ""].join("::");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(image);
  }
  return out;
}

function nullableJsonInput(value: Prisma.InputJsonValue | null): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return value ?? Prisma.JsonNull;
}

function dominantProductTypeId(variants: SpreadconnectArticleVariant[]) {
  const counts = new Map<number, number>();
  for (const variant of variants) {
    if (typeof variant.productTypeId !== "number" || !Number.isFinite(variant.productTypeId)) continue;
    counts.set(variant.productTypeId, (counts.get(variant.productTypeId) ?? 0) + 1);
  }
  const winner = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  return winner?.[0] ?? null;
}

function dominantProductTypeName(variants: SpreadconnectArticleVariant[], productTypeId: number | null) {
  if (productTypeId != null) {
    const match = variants.find(
      (variant) =>
        variant.productTypeId === productTypeId &&
        typeof variant.productTypeName === "string" &&
        variant.productTypeName.trim() !== "",
    );
    if (match?.productTypeName?.trim()) return match.productTypeName.trim();
  }

  const fallback = variants.find(
    (variant) => typeof variant.productTypeName === "string" && variant.productTypeName.trim() !== "",
  );
  return fallback?.productTypeName?.trim() ?? null;
}

function preferredCurrency() {
  return (process.env.SPREADCONNECT_CATALOG_CURRENCY?.trim().toUpperCase() || "EUR").slice(0, 8);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function catalogFingerprint(prepared: PreparedArticle): string {
  const payload = {
    id: prepared.articleId,
    name: prepared.name,
    description: prepared.description,
    images: [...prepared.images]
      .map((image) => ({
        url: image.url,
        appearanceName: image.appearanceName,
        appearanceId: image.appearanceId,
        perspective: image.perspective,
        imageId: image.imageId,
      }))
      .sort((a, b) => a.url.localeCompare(b.url)),
    priceCents: prepared.priceCents,
    supplyCostCents: prepared.supplyCostCents,
    spreadconnectProductTypeId: prepared.spreadconnectProductTypeId,
    spreadconnectProductTypeName: prepared.spreadconnectProductTypeName,
    spreadconnectCategoryData: prepared.spreadconnectCategoryData,
    variants: prepared.variants
      .map((v) => ({
        sku: v.sku,
        label: v.label,
        optionSize: v.optionSize,
        optionColor: v.optionColor,
        priceCents: v.priceCents,
        supplyCostCents: v.supplyCostCents,
        sortOrder: v.sortOrder,
      }))
      .sort((a, b) => a.sku.localeCompare(b.sku)),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function articlesPageFromJson(json: unknown): SpreadconnectArticle[] {
  if (json == null || typeof json !== "object") return [];
  const o = json as Record<string, unknown>;
  const rawItems = o.items;
  if (Array.isArray(rawItems)) {
    return rawItems.filter((row): row is SpreadconnectArticle => row != null && typeof row === "object");
  }
  if (Array.isArray(json)) {
    return json.filter((row): row is SpreadconnectArticle => row != null && typeof row === "object");
  }
  return [];
}

/** Parse Spreadconnect RFC7807-style JSON errors so support references are visible in logs and admin UI. */
function formatSpreadconnectArticlesFetchError(status: number, bodyText: string, statusText: string) {
  const raw = bodyText.replace(/^\uFEFF/, "").trim();

  function fromParsed(ref: string, title: string) {
    if (!title && !ref) return null;
    let msg = `Spreadconnect articles fetch failed (${status})`;
    if (title) msg += `: ${title}`;
    if (ref) msg += ` — reference ${ref}`;
    if (status >= 500) {
      return `${msg}. This is an error on Spreadconnect’s side; retry later or contact their support with the reference.`;
    }
    return msg;
  }

  try {
    const j = JSON.parse(raw) as { reference?: unknown; title?: unknown };
    const ref = typeof j.reference === "string" ? j.reference.trim() : "";
    const title = typeof j.title === "string" ? j.title.trim() : "";
    const formatted = fromParsed(ref, title);
    if (formatted) return formatted;
  } catch {
    /* fall through: regex fallback for malformed / wrapped JSON */
  }

  const refMatch = raw.match(/"reference"\s*:\s*"([0-9a-f-]{36})"/i);
  const titleMatch = raw.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const ref = refMatch?.[1]?.trim() ?? "";
  const title = titleMatch?.[1]?.replace(/\\"/g, '"').trim() ?? "";
  const formatted = fromParsed(ref, title);
  if (formatted) return formatted;

  const snippet = raw.slice(0, 600) || statusText;
  return `Spreadconnect articles fetch failed (${status}): ${snippet}`;
}

function formatSpreadconnectArticleFetchError(
  articleId: number,
  status: number,
  bodyText: string,
  statusText: string,
) {
  return formatSpreadconnectArticlesFetchError(status, bodyText, statusText).replace(
    "Spreadconnect articles fetch failed",
    `Spreadconnect article ${articleId} fetch failed`,
  );
}

async function fetchSpreadconnectArticlesPage(
  cfg: SpreadconnectConfig,
  limit: number,
  offset: number,
): Promise<SpreadconnectArticle[]> {
  const res = await fetch(`${cfg.baseUrl}/articles?limit=${limit}&offset=${offset}`, {
    headers: { "X-SPOD-ACCESS-TOKEN": cfg.apiKey },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(formatSpreadconnectArticlesFetchError(res.status, text, res.statusText));
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Spreadconnect articles response is not JSON (${text.slice(0, 200) || "empty body"})`,
    );
  }

  return articlesPageFromJson(json);
}

async function fetchSpreadconnectArticleById(
  cfg: SpreadconnectConfig,
  articleId: number,
): Promise<SpreadconnectArticle | null> {
  const res = await fetch(`${cfg.baseUrl}/articles/${articleId}`, {
    headers: { "X-SPOD-ACCESS-TOKEN": cfg.apiKey },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(formatSpreadconnectArticleFetchError(articleId, res.status, text, res.statusText));
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Spreadconnect article ${articleId} response is not JSON (${text.slice(0, 200) || "empty body"})`,
    );
  }

  if (json == null || typeof json !== "object") return null;
  return json as SpreadconnectArticle;
}

async function fetchSpreadconnectProductTypeCategories(
  cfg: SpreadconnectConfig,
  productTypeId: number,
): Promise<Prisma.InputJsonValue | null> {
  const res = await fetch(`${cfg.baseUrl}/productTypes/${productTypeId}/categories`, {
    headers: { "X-SPOD-ACCESS-TOKEN": cfg.apiKey },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Spreadconnect product type ${productTypeId} categories fetch failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return (await res.json().catch(() => null)) as Prisma.InputJsonValue | null;
}

async function prepareArticle(
  article: SpreadconnectArticle,
  cfg: SpreadconnectConfig,
  categoryCache: Map<number, Prisma.InputJsonValue | null>,
): Promise<PreparedArticle | null> {
  const name = article.title?.trim() || "";
  const slugBase = normalizeWearSlug(name);
  if (!name || !slugBase) return null;

  const sourceVariants = article.variants ?? [];
  const mappedVariants = sourceVariants
    .map((variant, index) => {
      const sku = variant.sku?.trim();
      if (!sku) return null;
      return {
        sku,
        label: labelForVariant(variant),
        optionSize: variant.sizeName?.trim() || null,
        optionColor: variant.appearanceName?.trim() || null,
        priceCents: centsFromAmount(variant.d2cPrice),
        supplyCostCents: centsFromAmount(variant.b2bPrice),
        sortOrder: index,
      } satisfies SyncedVariant;
    })
    .filter((value): value is SyncedVariant => value !== null);

  const imageUrls = uniqueHttpsUrls((article.images ?? []).map((image) => image.imageUrl));
  const mappedImages = uniqueWearImages(
    (article.images ?? [])
      .map((image) => {
        const url = image.imageUrl?.trim();
        if (!url || !/^https?:\/\//i.test(url)) return null;
        return {
          url,
          appearanceName: image.appearanceName?.trim() || null,
          appearanceId:
            typeof image.appearanceId === "number" && Number.isFinite(image.appearanceId)
              ? Math.trunc(image.appearanceId)
              : null,
          perspective: image.perspective?.trim() || null,
          imageId: typeof image.id === "number" && Number.isFinite(image.id) ? Math.trunc(image.id) : null,
        } satisfies WearCatalogImage;
      })
      .filter((value): value is WearCatalogImage => value !== null),
  );
  if (mappedVariants.length === 0 || imageUrls.length === 0 || mappedImages.length === 0) return null;

  const priceCandidates = mappedVariants.map((variant) => variant.priceCents).filter((value): value is number => value != null);
  if (priceCandidates.length === 0) return null;

  const supplyCandidates = mappedVariants
    .map((variant) => variant.supplyCostCents)
    .filter((value): value is number => value != null);
  const minSupplyCostCents = supplyCandidates.length > 0 ? Math.min(...supplyCandidates) : null;

  const spreadconnectProductTypeId = dominantProductTypeId(sourceVariants);
  const spreadconnectProductTypeName = dominantProductTypeName(sourceVariants, spreadconnectProductTypeId);
  let spreadconnectCategoryData: Prisma.InputJsonValue | null = null;
  if (spreadconnectProductTypeId != null) {
    if (categoryCache.has(spreadconnectProductTypeId)) {
      spreadconnectCategoryData = categoryCache.get(spreadconnectProductTypeId) ?? null;
    } else {
      spreadconnectCategoryData = await fetchSpreadconnectProductTypeCategories(cfg, spreadconnectProductTypeId);
      categoryCache.set(spreadconnectProductTypeId, spreadconnectCategoryData);
    }
  }

  return {
    articleId: typeof article.id === "number" ? article.id : null,
    name,
    slugBase,
    description: article.description?.trim() || null,
    images: mappedImages,
    priceCents: Math.min(...priceCandidates),
    supplyCostCents: minSupplyCostCents,
    currency: preferredCurrency(),
    externalFulfillmentId: mappedVariants.length === 1 ? mappedVariants[0].sku : null,
    spreadconnectProductTypeId,
    spreadconnectProductTypeName,
    spreadconnectCategoryData,
    variants: mappedVariants,
  };
}

async function findExistingProduct(prepared: PreparedArticle) {
  const skus = prepared.variants.map((variant) => variant.sku);
  const orClause: Prisma.WearProductWhereInput[] = [
    { slug: prepared.slugBase },
    { externalFulfillmentId: { in: skus } },
    { variants: { some: { sku: { in: skus } } } },
  ];
  if (prepared.articleId != null) {
    orClause.push({ spreadconnectArticleId: prepared.articleId });
  }

  return prisma.wearProduct.findFirst({
    where: { OR: orClause },
    include: {
      variants: {
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      },
    },
  });
}

async function ensureUniqueSlug(base: string, existingProductId: string | null) {
  let slug = base;
  let suffix = 2;
  for (;;) {
    const conflict = await prisma.wearProduct.findFirst({
      where: {
        slug,
        ...(existingProductId ? { NOT: { id: existingProductId } } : {}),
      },
      select: { id: true },
    });
    if (!conflict) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function syncPreparedArticle(prepared: PreparedArticle) {
  const existing = await findExistingProduct(prepared);
  const fp = catalogFingerprint(prepared);

  const hasImage = prepared.images.length > 0;
  const hasVariantSku = prepared.variants.some((v) => typeof v.sku === "string" && v.sku.length > 0);
  const eligibleForReady = hasImage && hasVariantSku;
  const existingStatus = existing?.assetHealthStatus ?? null;
  const shouldPromote = eligibleForReady && existingStatus !== "invalid";
  const assetHealthData = shouldPromote ? { assetHealthStatus: "ready" as const } : {};

  if (
    existing &&
    prepared.articleId != null &&
    existing.spreadconnectArticleId === prepared.articleId &&
    existing.spreadconnectCatalogFingerprint != null &&
    existing.spreadconnectCatalogFingerprint === fp
  ) {
    if (shouldPromote && existingStatus !== "ready") {
      await prisma.wearProduct.update({
        where: { id: existing.id },
        data: { assetHealthStatus: "ready" },
      });
    }
    return {
      id: existing.id,
      created: false,
      variantCount: prepared.variants.length,
      unchanged: true as const,
    };
  }

  const slug = await ensureUniqueSlug(prepared.slugBase, existing?.id ?? null);

  const articleIdData =
    prepared.articleId != null ? { spreadconnectArticleId: prepared.articleId } : {};

  const supplyCostData =
    prepared.supplyCostCents != null ? { supplyCostCents: prepared.supplyCostCents } : {};

  const product = existing
    ? await prisma.wearProduct.update({
        where: { id: existing.id },
        data: {
          slug,
          name: prepared.name,
          description: prepared.description,
          images: wearImagesToJson(prepared.images),
          priceCents: prepared.priceCents,
          currency: existing.currency || prepared.currency,
          isActive: true,
          archivedAt: null,
          externalFulfillmentId: prepared.externalFulfillmentId,
          spreadconnectProductTypeId: prepared.spreadconnectProductTypeId,
          spreadconnectProductTypeName: prepared.spreadconnectProductTypeName,
          spreadconnectCategoryData: nullableJsonInput(prepared.spreadconnectCategoryData),
          spreadconnectCatalogFingerprint: fp,
          ...supplyCostData,
          ...articleIdData,
          ...assetHealthData,
        },
      })
    : await prisma.wearProduct.create({
        data: {
          slug,
          name: prepared.name,
          description: prepared.description,
          priceCents: prepared.priceCents,
          currency: prepared.currency,
          images: wearImagesToJson(prepared.images),
          isActive: true,
          archivedAt: null,
          externalFulfillmentId: prepared.externalFulfillmentId,
          spreadconnectProductTypeId: prepared.spreadconnectProductTypeId,
          spreadconnectProductTypeName: prepared.spreadconnectProductTypeName,
          spreadconnectCategoryData: nullableJsonInput(prepared.spreadconnectCategoryData),
          spreadconnectCatalogFingerprint: fp,
          ...supplyCostData,
          ...articleIdData,
          ...assetHealthData,
        },
      });

  const existingVariants = existing?.variants ?? [];
  const incomingSkus = new Set(prepared.variants.map((variant) => variant.sku));

  for (const variant of prepared.variants) {
    const current = existingVariants.find((row) => row.sku === variant.sku);
    if (current) {
      await prisma.wearProductVariant.update({
        where: { id: current.id },
        data: {
          label: variant.label,
          sku: variant.sku,
          optionSize: variant.optionSize,
          optionColor: variant.optionColor,
          priceCents: variant.priceCents,
          sortOrder: variant.sortOrder,
          isActive: true,
        },
      });
    } else {
      await prisma.wearProductVariant.create({
        data: {
          wearProductId: product.id,
          label: variant.label,
          sku: variant.sku,
          optionSize: variant.optionSize,
          optionColor: variant.optionColor,
          priceCents: variant.priceCents,
          sortOrder: variant.sortOrder,
          isActive: true,
        },
      });
    }
  }

  const staleVariantIds = existingVariants.filter((row) => !row.sku || !incomingSkus.has(row.sku)).map((row) => row.id);
  if (staleVariantIds.length > 0) {
    await prisma.wearProductVariant.updateMany({
      where: { id: { in: staleVariantIds } },
      data: { isActive: false },
    });
  }

  return {
    id: product.id,
    created: !existing,
    variantCount: prepared.variants.length,
    unchanged: false as const,
  };
}

async function archiveUnsyncedPlaceholderProducts(syncedIds: string[]) {
  if (syncedIds.length === 0) return 0;

  const result = await prisma.wearProduct.updateMany({
    where: {
      id: { notIn: syncedIds },
      archivedAt: null,
      isActive: true,
      externalFulfillmentId: null,
      variants: {
        none: {
          isActive: true,
          sku: { not: null },
        },
      },
    },
    data: {
      archivedAt: new Date(),
    },
  });

  return result.count;
}

export async function syncSpreadconnectCatalogToWearProducts(
  options?: SpreadconnectCatalogSyncOptions,
): Promise<SpreadconnectCatalogSyncResult> {
  const cfg = getSpreadconnectConfig();
  if (!cfg) throw new Error("Spreadconnect not configured");

  const fullDiscovery =
    options?.fullDiscovery === true || process.env.SPREADCONNECT_SYNC_FULL_DISCOVERY === "1";

  const pageLimit = clamp(parseInt(process.env.SPREADCONNECT_SYNC_PAGE_LIMIT || "25", 10), 5, 100);
  const maxDiscoveryPages = fullDiscovery
    ? Number.MAX_SAFE_INTEGER
    : clamp(parseInt(process.env.SPREADCONNECT_SYNC_DISCOVER_MAX_PAGES || "1", 10), 0, 500);
  const gapArticleMs = clamp(parseInt(process.env.SPREADCONNECT_REQUEST_GAP_MS || "250", 10), 0, 5000);
  const gapPageMs = clamp(parseInt(process.env.SPREADCONNECT_PAGE_GAP_MS || "400", 10), 0, 10000);

  const knownRows = await prisma.wearProduct.findMany({
    where: { spreadconnectArticleId: { not: null } },
    select: { spreadconnectArticleId: true },
  });
  const knownIds = [...new Set(knownRows.map((r) => r.spreadconnectArticleId).filter((id): id is number => id != null))].sort(
    (a, b) => a - b,
  );

  const articlesToProcess: SpreadconnectArticle[] = [];
  const seenArticleIds = new Set<number>();
  const categoryCache = new Map<number, Prisma.InputJsonValue | null>();
  let refreshedByArticleId = 0;
  let discoveryListPages = 0;
  let fullCatalogScanCompleted = false;

  for (const articleId of knownIds) {
    if (gapArticleMs > 0) await sleep(gapArticleMs);
    const article = await fetchSpreadconnectArticleById(cfg, articleId);
    if (article) {
      articlesToProcess.push(article);
      if (typeof article.id === "number") seenArticleIds.add(article.id);
      refreshedByArticleId += 1;
    }
  }

  let discoveryOffset = 0;
  let pagesDone = 0;

  for (;;) {
    if (!fullDiscovery && pagesDone >= maxDiscoveryPages) break;

    if (discoveryListPages > 0 && gapPageMs > 0) await sleep(gapPageMs);

    const page = await fetchSpreadconnectArticlesPage(cfg, pageLimit, discoveryOffset);
    discoveryListPages += 1;
    pagesDone += 1;

    if (page.length === 0) {
      fullCatalogScanCompleted = true;
      break;
    }

    for (const a of page) {
      const aid = typeof a.id === "number" ? a.id : null;
      if (aid == null) continue;
      if (seenArticleIds.has(aid)) continue;
      seenArticleIds.add(aid);
      articlesToProcess.push(a);
    }

    discoveryOffset += pageLimit;

    if (page.length < pageLimit) {
      fullCatalogScanCompleted = true;
      break;
    }

    if (!fullDiscovery && pagesDone >= maxDiscoveryPages) break;
  }

  let createdProducts = 0;
  let updatedProducts = 0;
  let skippedUnchangedProducts = 0;
  let skippedArticles = 0;
  let syncedVariants = 0;
  const syncedIds: string[] = [];

  for (const article of articlesToProcess) {
    const prepared = await prepareArticle(article, cfg, categoryCache);
    if (!prepared) {
      skippedArticles += 1;
      continue;
    }

    const synced = await syncPreparedArticle(prepared);
    syncedVariants += synced.variantCount;

    if (synced.unchanged) {
      skippedUnchangedProducts += 1;
      continue;
    }

    syncedIds.push(synced.id);
    if (synced.created) createdProducts += 1;
    else updatedProducts += 1;
  }

  const archivedProducts =
    fullDiscovery && fullCatalogScanCompleted ? await archiveUnsyncedPlaceholderProducts(syncedIds) : 0;

  const unknownImageHosts = await listUnknownWearImageHostsForActiveCatalog();

  const syncedProducts = createdProducts + updatedProducts + skippedUnchangedProducts;

  const fetchedArticles = articlesToProcess.length;
  const syncMode: "full" | "partial" = fullDiscovery ? "full" : "partial";
  const skipRatio = fetchedArticles > 0 ? skippedArticles / fetchedArticles : 0;

  return {
    fetchedArticles,
    syncedProducts,
    createdProducts,
    updatedProducts,
    skippedUnchangedProducts,
    archivedProducts,
    skippedArticles,
    syncedVariants,
    refreshedByArticleId,
    discoveryListPages,
    fullCatalogScanCompleted,
    unknownImageHosts,
    syncMode,
    skipRatio,
  };
}
