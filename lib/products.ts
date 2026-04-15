import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sortProductsByMarketplaceRanking } from "@/lib/ranking/score-engine";
import { ceramicCategoryFromSlug } from "@/lib/ceramic-categories";
import { studioCanOperateWhere } from "@/lib/studio-operating-gates";
import type { ShippingZone } from "@/lib/shipping-zones";
import { isShippingZone, normalizeCountryCode } from "@/lib/shipping-zones";

/** In-memory fairness shuffle for recommended sort on early pages (P4-G); deeper pages use SQL order only. */
const RECOMMENDED_SHUFFLE_CAP = 400;

export type ProductSort = "recommended" | "popular" | "newest" | "price_asc" | "price_desc" | "featured";

export const PRODUCT_SORT_VALUES: ProductSort[] = [
  "recommended",
  "popular",
  "newest",
  "featured",
  "price_asc",
  "price_desc",
];

export function parseProductSort(value: string | undefined | null): ProductSort {
  if (value && (PRODUCT_SORT_VALUES as readonly string[]).includes(value)) {
    return value as ProductSort;
  }
  return "recommended";
}

export type ProductQueryInput = {
  q?: string;
  category?: string | null;
  country?: string | null;
  city?: string | null;
  studioId?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: ProductSort;
  inStock?: boolean;
  shippingRegion?: ShippingZone | null;
  viewerCountry?: string | null;
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 12;

function activeStudioWhere(country?: string | null, city?: string | null): Prisma.StudioWhereInput {
  const where: Prisma.StudioWhereInput = studioCanOperateWhere();
  if (country) where.country = country;
  if (city) where.city = city;
  return where;
}

export function buildProductWhere(input: ProductQueryInput): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    status: "active",
    studio: activeStudioWhere(input.country, input.city),
  };

  if (input.category) {
    const category = ceramicCategoryFromSlug(input.category);
    if (category) where.category = category;
  }
  if (input.studioId) {
    where.studioId = input.studioId;
  }
  if (input.inStock) {
    const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [
      ...existingAnd,
      {
        OR: [
          {
            AND: [{ variants: { none: {} } }, { stockStatus: "in_stock" }, { stockQuantity: { gt: 0 } }],
          },
          {
            variants: {
              some: {
                OR: [{ stockQuantity: null }, { stockQuantity: { gt: 0 } }],
              },
            },
          },
        ],
      },
    ];
  }
  if (input.shippingRegion && isShippingZone(input.shippingRegion)) {
    const zone = input.shippingRegion;
    const viewerCountry = normalizeCountryCode(input.viewerCountry);
    if (zone === "domestic") {
      if (viewerCountry) {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { shippingDomesticCents: { not: null } },
          { studio: { country: { equals: viewerCountry, mode: "insensitive" } } },
        ];
      } else {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { id: { equals: "__no_domestic_without_country__" } },
        ];
      }
    } else if (zone === "europe") {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { shippingEuropeCents: { not: null } }];
    } else if (zone === "usa") {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { shippingUsaCents: { not: null } }];
    } else if (zone === "canada") {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { shippingCanadaCents: { not: null } }];
    } else if (zone === "asia") {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { shippingAsiaCents: { not: null } }];
    }
  }

  const effectiveMin = typeof input.minPrice === "number" ? input.minPrice : undefined;
  const effectiveMax = typeof input.maxPrice === "number" ? input.maxPrice : undefined;
  if (effectiveMin !== undefined || effectiveMax !== undefined) {
    where.OR = [
      {
        salePriceCents: {
          ...(effectiveMin !== undefined ? { gte: effectiveMin } : {}),
          ...(effectiveMax !== undefined ? { lte: effectiveMax } : {}),
        },
      },
      {
        AND: [
          { salePriceCents: null },
          {
            priceCents: {
              ...(effectiveMin !== undefined ? { gte: effectiveMin } : {}),
              ...(effectiveMax !== undefined ? { lte: effectiveMax } : {}),
            },
          },
        ],
      },
    ];
  }

  const q = input.q?.trim();
  if (q) {
    const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [
      ...existingAnd,
      {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { shortDescription: { contains: q, mode: "insensitive" } },
          { fullDescription: { contains: q, mode: "insensitive" } },
          { materials: { contains: q, mode: "insensitive" } },
          { studio: { displayName: { contains: q, mode: "insensitive" } } },
          { categoryMeta: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
    ];
  }

  return where;
}

export function buildProductOrderBy(sort: ProductSort = "recommended"): Prisma.ProductOrderByWithRelationInput[] {
  if (sort === "price_asc") return [{ salePriceCents: "asc" }, { priceCents: "asc" }, { createdAt: "desc" }];
  if (sort === "price_desc") return [{ salePriceCents: "desc" }, { priceCents: "desc" }, { createdAt: "desc" }];
  if (sort === "newest") return [{ createdAt: "desc" }];
  if (sort === "popular") {
    return [{ studio: { rankingScore: { compositeScore: "desc" } } }, { createdAt: "desc" }];
  }
  // recommended: quality/activity ranking + recency
  return [
    { studio: { rankingScore: { compositeScore: "desc" } } },
    { createdAt: "desc" },
  ];
}

const marketplaceListInclude = {
  studio: {
    select: {
      id: true,
      displayName: true,
      city: true,
      country: true,
      marketplaceRankWeight: true,
      rankingScore: { select: { compositeScore: true } },
    },
  },
  categoryMeta: { select: { id: true, name: true, slug: true } },
  images: { where: { isPrimary: true }, take: 1 },
  variants: {
    select: { id: true, name: true, priceCents: true, stockQuantity: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
};

export async function listMarketplaceProducts(input: ProductQueryInput) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
  const where = buildProductWhere(input);
  const orderBy = buildProductOrderBy(input.sort);
  try {
    const total = await prisma.product.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    if (input.sort === "recommended" && total > 0 && start < Math.min(RECOMMENDED_SHUFFLE_CAP, total)) {
      const cap = Math.min(RECOMMENDED_SHUFFLE_CAP, total);
      const batch = await prisma.product.findMany({
        where,
        orderBy,
        take: cap,
        include: marketplaceListInclude,
      });
      const ranked = sortProductsByMarketplaceRanking(batch) as typeof batch;
      const products = ranked.slice(start, start + pageSize);
      return { products, total, page, pageSize, pageCount };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy,
      skip: start,
      take: pageSize,
      include: marketplaceListInclude,
    });

    return {
      products,
      total,
      page,
      pageSize,
      pageCount,
    };
  } catch {
    return {
      products: [],
      total: 0,
      page: 1,
      pageSize,
      pageCount: 1,
    };
  }
}

export async function getMarketplaceProduct(productId: string) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      status: "active",
      studio: {
        ...studioCanOperateWhere(),
      },
    },
    include: {
      studio: true,
      categoryMeta: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!product) return null;

  const related = await prisma.product.findMany({
    where: {
      studioId: product.studioId,
      status: "active",
      id: { not: product.id },
    },
    take: 4,
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      studio: { select: { id: true, displayName: true, city: true, country: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { product, related };
}
