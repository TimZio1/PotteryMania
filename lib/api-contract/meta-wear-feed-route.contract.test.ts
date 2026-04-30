import { beforeEach, describe, expect, it, vi } from "vitest";

const metaWearFeedRouteMocks = vi.hoisted(() => ({
  findWearPublicProductsWithVariantsRetrying: vi.fn(),
  resolveWearInternalPricingConfig: vi.fn(),
  mapWearProductRowToInternalPricesWithConfig: vi.fn(),
}));

vi.mock("@/lib/wear-public-catalog-query", () => ({
  findWearPublicProductsWithVariantsRetrying: metaWearFeedRouteMocks.findWearPublicProductsWithVariantsRetrying,
}));

vi.mock("@/lib/wear-internal-pricing", () => ({
  resolveWearInternalPricingConfig: metaWearFeedRouteMocks.resolveWearInternalPricingConfig,
  mapWearProductRowToInternalPricesWithConfig: metaWearFeedRouteMocks.mapWearProductRowToInternalPricesWithConfig,
}));

import { GET } from "@/app/api/meta/wear-catalog.csv/route";
import { merchantFeedOfferId } from "@/lib/meta-wear-feed";

describe("API contract: GET /api/meta/wear-catalog.csv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    metaWearFeedRouteMocks.findWearPublicProductsWithVariantsRetrying.mockResolvedValue({
      ok: true,
      rows: [
        {
          id: "prod_1",
          slug: "studio-mark-tee",
          name: "Studio mark tee",
          subtitle: "Heavy cotton",
          description: "Quiet maker staple",
          priceCents: 2800,
          currency: "EUR",
          images: [{ url: "https://cdn.example.com/product.jpg" }],
          variants: [],
          spreadconnectProductTypeName: "Organic T-Shirt",
          spreadconnectCategoryData: null,
        },
      ],
    });
    metaWearFeedRouteMocks.resolveWearInternalPricingConfig.mockResolvedValue({
      fallbackCostsEur: { tshirt: 10, hoodie: 18 },
      rules: { tshirt: { type: "fixed", valueEur: 10 }, hoodie: { type: "fixed", valueEur: 15 } },
    });
    metaWearFeedRouteMocks.mapWearProductRowToInternalPricesWithConfig.mockImplementation((row) => row);
  });

  it("returns CSV with headers and content type", async () => {
    const res = await GET();
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(text).toContain('"id","title","description"');
    expect(text).toContain(`"${merchantFeedOfferId("prod_1")}"`);
    expect(metaWearFeedRouteMocks.mapWearProductRowToInternalPricesWithConfig).toHaveBeenCalledTimes(1);
  });

  it("returns 503 json when the catalog query fails", async () => {
    metaWearFeedRouteMocks.findWearPublicProductsWithVariantsRetrying.mockResolvedValue({
      ok: false,
      error: new Error("db offline"),
    });

    const res = await GET();
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(503);
    expect(json.error).toBe("wear_catalog_unavailable");
  });
});
