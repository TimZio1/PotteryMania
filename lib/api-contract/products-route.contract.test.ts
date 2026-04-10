import { beforeEach, describe, expect, it, vi } from "vitest";

const productRouteMocks = vi.hoisted(() => ({
  assertRateLimit: vi.fn(),
  listMarketplaceProducts: vi.fn(),
  parseProductSort: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  assertRateLimit: productRouteMocks.assertRateLimit,
}));

vi.mock("@/lib/products", () => ({
  listMarketplaceProducts: productRouteMocks.listMarketplaceProducts,
  parseProductSort: productRouteMocks.parseProductSort,
}));

import { GET } from "@/app/api/products/route";

describe("API contract: GET /api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productRouteMocks.assertRateLimit.mockReturnValue({ allowed: true });
    productRouteMocks.parseProductSort.mockReturnValue("recommended");
    productRouteMocks.listMarketplaceProducts.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 12,
    });
  });

  it("returns 429 with error payload when rate limit rejects request", async () => {
    productRouteMocks.assertRateLimit.mockReturnValue({ allowed: false });
    const req = new Request("http://localhost:3000/api/products");

    const res = await GET(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(429);
    expect(json.error).toBe("Too many search requests");
    expect(productRouteMocks.listMarketplaceProducts).not.toHaveBeenCalled();
  });

  it("passes normalized query params and returns list contract", async () => {
    const req = new Request(
      "http://localhost:3000/api/products?q=wheel&category=mugs&minPrice=100&maxPrice=900&page=2&pageSize=24&inStock=1&sort=newest",
    );

    const res = await GET(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ items: [], total: 0, page: 1, pageSize: 12 });
    expect(productRouteMocks.parseProductSort).toHaveBeenCalledWith("newest");
    expect(productRouteMocks.listMarketplaceProducts).toHaveBeenCalledWith({
      q: "wheel",
      category: "mugs",
      country: null,
      city: null,
      studioId: null,
      shippingRegion: null,
      viewerCountry: null,
      minPrice: 100,
      maxPrice: 900,
      sort: "recommended",
      inStock: true,
      page: 2,
      pageSize: 24,
    });
  });
});
