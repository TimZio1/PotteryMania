import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ProductSort = "newest" | "price_asc" | "price_desc" | "featured";

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
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 12;

function activeStudioWhere(country?: string | null, city?: string | null): Prisma.StudioWhereInput {
  const where: Prisma.StudioWhereInput = {
    status: "approved",
    activationPaidAt: { not: null },
  };
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
    where.category = { slug: input.category };
  }
  if (input.studioId) {
    where.studioId = input.studioId;
  }
  if (input.inStock) {
    where.stockStatus = "in_stock";
    where.stockQuantity = { gt: 0 };
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
          { category: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
    ];
  }

  return where;
}

export function buildProductOrderBy(sort: ProductSort = "newest"): Prisma.ProductOrderByWithRelationInput[] {
  if (sort === "price_asc") return [{ salePriceCents: "asc" }, { priceCents: "asc" }, { createdAt: "desc" }];
  if (sort === "price_desc") return [{ salePriceCents: "desc" }, { priceCents: "desc" }, { createdAt: "desc" }];
  if (sort === "featured") return [{ isFeatured: "desc" }, { createdAt: "desc" }];
  return [{ createdAt: "desc" }];
}

export async function listMarketplaceProducts(input: ProductQueryInput) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
  const where = buildProductWhere(input);
  const orderBy = buildProductOrderBy(input.sort);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        studio: { select: { id: true, displayName: true, city: true, country: true } },
        category: { select: { id: true, name: true, slug: true } },
        images: { where: { isPrimary: true }, take: 1 },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getMarketplaceProduct(productId: string) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      status: "active",
      studio: {
        status: "approved",
        activationPaidAt: { not: null },
      },
    },
    include: {
      studio: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
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
