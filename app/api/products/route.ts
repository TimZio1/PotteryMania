import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const categorySlug = searchParams.get("category");
  const country = searchParams.get("country");
  const city = searchParams.get("city");
  const studioId = searchParams.get("studioId");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const sort = searchParams.get("sort") || "newest";
  const inStock = searchParams.get("inStock") === "1";

  const studioWhere: Prisma.StudioWhereInput = { status: "approved" };
  if (country) studioWhere.country = country;
  if (city) studioWhere.city = city;

  const where: Prisma.ProductWhereInput = {
    status: "active",
    studio: studioWhere,
  };

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }
  if (studioId) {
    where.studioId = studioId;
  }
  if (inStock) {
    where.stockStatus = "in_stock";
    where.stockQuantity = { gt: 0 };
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = {
    createdAt: "desc",
  };
  if (sort === "price_asc") orderBy = { priceCents: "asc" };
  if (sort === "price_desc") orderBy = { priceCents: "desc" };
  if (sort === "featured") orderBy = [{ isFeatured: "desc" }, { createdAt: "desc" }];

  const products = await prisma.product.findMany({
    where,
    orderBy,
    take: 60,
    include: {
      studio: {
        select: { id: true, displayName: true, city: true, country: true },
      },
      category: { select: { name: true, slug: true } },
      images: { where: { isPrimary: true }, take: 1 },
    },
  });

  let filtered = products;
  if (minPrice) {
    const n = parseInt(minPrice, 10);
    if (!Number.isNaN(n)) filtered = filtered.filter((p) => (p.salePriceCents ?? p.priceCents) >= n);
  }
  if (maxPrice) {
    const n = parseInt(maxPrice, 10);
    if (!Number.isNaN(n)) filtered = filtered.filter((p) => (p.salePriceCents ?? p.priceCents) <= n);
  }

  return NextResponse.json({ products: filtered });
}