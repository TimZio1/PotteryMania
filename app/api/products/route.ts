import { NextResponse } from "next/server";
import { listMarketplaceProducts, parseProductSort } from "@/lib/products";
import { assertRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const rate = assertRateLimit(req, "products:list", 90, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many search requests" }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const result = await listMarketplaceProducts({
    q: searchParams.get("q") || undefined,
    category: searchParams.get("category"),
    country: searchParams.get("country"),
    city: searchParams.get("city"),
    studioId: searchParams.get("studioId"),
    minPrice: searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!, 10) : undefined,
    maxPrice: searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!, 10) : undefined,
    sort: parseProductSort(searchParams.get("sort")),
    inStock: searchParams.get("inStock") === "1",
    page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
    pageSize: searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 12,
  });

  return NextResponse.json(result);
}