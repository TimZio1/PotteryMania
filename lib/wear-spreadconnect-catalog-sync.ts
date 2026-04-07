import { prisma } from "@/lib/db";
import { getSpreadconnectConfig } from "@/lib/spreadconnect-config";
import { normalizeWearSlug } from "@/lib/wear-slug";
import { listUnknownWearImageHostsForActiveCatalog } from "@/lib/wear-catalog-health";

type SpreadconnectArticleVariant = {
  sku?: string | null;
  sizeName?: string | null;
  appearanceName?: string | null;
  d2cPrice?: number | null;
};

type SpreadconnectArticleImage = {
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
  sortOrder: number;
};

type PreparedArticle = {
  articleId: number | null;
  name: string;
  slugBase: string;
  description: string | null;
  images: string[];
  priceCents: number;
  currency: string;
  externalFulfillmentId: string | null;
  variants: SyncedVariant[];
};

export type SpreadconnectCatalogSyncResult = {
  fetchedArticles: number;
  syncedProducts: number;
  createdProducts: number;
  updatedProducts: number;
  archivedProducts: number;
  skippedArticles: number;
  syncedVariants: number;
  /** Image hostnames not in Next.js `remotePatterns` — add to `next.config.ts` if legitimate. */
  unknownImageHosts: string[];
};

function labelForVariant(variant: SpreadconnectArticleVariant) {
  const parts = [variant.sizeName?.trim(), variant.appearanceName?.trim()].filter(Boolean);
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

function preferredCurrency() {
  return (process.env.SPREADCONNECT_CATALOG_CURRENCY?.trim().toUpperCase() || "EUR").slice(0, 8);
}

async function fetchSpreadconnectArticles() {
  const cfg = getSpreadconnectConfig();
  if (!cfg) throw new Error("Spreadconnect not configured");

  const limit = 100;
  const items: SpreadconnectArticle[] = [];

  for (let offset = 0; ; offset += limit) {
    const res = await fetch(`${cfg.baseUrl}/articles?limit=${limit}&offset=${offset}`, {
      headers: { "X-SPOD-ACCESS-TOKEN": cfg.apiKey },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Spreadconnect articles fetch failed (${res.status}): ${text.slice(0, 300) || res.statusText}`);
    }

    const json = (await res.json()) as { items?: SpreadconnectArticle[] };
    const page = Array.isArray(json.items) ? json.items : [];
    items.push(...page);
    if (page.length < limit) break;
  }

  return items;
}

function prepareArticle(article: SpreadconnectArticle): PreparedArticle | null {
  const name = article.title?.trim() || "";
  const slugBase = normalizeWearSlug(name);
  if (!name || !slugBase) return null;

  const mappedVariants = (article.variants ?? [])
    .map((variant, index) => {
      const sku = variant.sku?.trim();
      if (!sku) return null;
      return {
        sku,
        label: labelForVariant(variant),
        optionSize: variant.sizeName?.trim() || null,
        optionColor: variant.appearanceName?.trim() || null,
        priceCents: centsFromAmount(variant.d2cPrice),
        sortOrder: index,
      } satisfies SyncedVariant;
    })
    .filter((value): value is SyncedVariant => value !== null);

  const imageUrls = uniqueHttpsUrls((article.images ?? []).map((image) => image.imageUrl));
  if (mappedVariants.length === 0 || imageUrls.length === 0) return null;

  const priceCandidates = mappedVariants.map((variant) => variant.priceCents).filter((value): value is number => value != null);
  if (priceCandidates.length === 0) return null;

  return {
    articleId: typeof article.id === "number" ? article.id : null,
    name,
    slugBase,
    description: article.description?.trim() || null,
    images: imageUrls,
    priceCents: Math.min(...priceCandidates),
    currency: preferredCurrency(),
    externalFulfillmentId: mappedVariants.length === 1 ? mappedVariants[0].sku : null,
    variants: mappedVariants,
  };
}

async function findExistingProduct(prepared: PreparedArticle) {
  const skus = prepared.variants.map((variant) => variant.sku);
  return prisma.wearProduct.findFirst({
    where: {
      OR: [
        { slug: prepared.slugBase },
        { externalFulfillmentId: { in: skus } },
        { variants: { some: { sku: { in: skus } } } },
      ],
    },
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
  const slug = await ensureUniqueSlug(prepared.slugBase, existing?.id ?? null);

  const product = existing
    ? await prisma.wearProduct.update({
        where: { id: existing.id },
        data: {
          slug,
          name: prepared.name,
          description: prepared.description,
          images: prepared.images,
          priceCents: prepared.priceCents,
          currency: existing.currency || prepared.currency,
          isActive: true,
          archivedAt: null,
          externalFulfillmentId: prepared.externalFulfillmentId,
        },
      })
    : await prisma.wearProduct.create({
        data: {
          slug,
          name: prepared.name,
          description: prepared.description,
          priceCents: prepared.priceCents,
          currency: prepared.currency,
          images: prepared.images,
          isActive: true,
          archivedAt: null,
          externalFulfillmentId: prepared.externalFulfillmentId,
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

export async function syncSpreadconnectCatalogToWearProducts(): Promise<SpreadconnectCatalogSyncResult> {
  const articles = await fetchSpreadconnectArticles();

  let createdProducts = 0;
  let updatedProducts = 0;
  let skippedArticles = 0;
  let syncedVariants = 0;
  const syncedIds: string[] = [];

  for (const article of articles) {
    const prepared = prepareArticle(article);
    if (!prepared) {
      skippedArticles += 1;
      continue;
    }

    const synced = await syncPreparedArticle(prepared);
    syncedIds.push(synced.id);
    syncedVariants += synced.variantCount;
    if (synced.created) createdProducts += 1;
    else updatedProducts += 1;
  }

  const archivedProducts = await archiveUnsyncedPlaceholderProducts(syncedIds);

  const unknownImageHosts = await listUnknownWearImageHostsForActiveCatalog();

  return {
    fetchedArticles: articles.length,
    syncedProducts: syncedIds.length,
    createdProducts,
    updatedProducts,
    archivedProducts,
    skippedArticles,
    syncedVariants,
    unknownImageHosts,
  };
}
