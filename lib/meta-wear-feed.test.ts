import { describe, expect, it } from "vitest";
import {
  merchantFeedOfferId,
  metaWearFeedCsv,
  metaWearFeedRows,
  type MetaWearFeedProduct,
} from "@/lib/meta-wear-feed";

function makeProduct(overrides: Partial<MetaWearFeedProduct> = {}): MetaWearFeedProduct {
  return {
    id: "prod_1",
    slug: "studio-mark-tee",
    name: "Studio mark tee",
    subtitle: "Heavy cotton",
    description: 'Quiet "maker" staple',
    priceCents: 2800,
    currency: "eur",
    images: [{ url: "https://cdn.example.com/product.jpg" }],
    variants: [],
    spreadconnectProductTypeName: "Organic T-Shirt",
    spreadconnectCategoryData: null,
    ...overrides,
  };
}

describe("metaWearFeedRows", () => {
  it("emits one row per variant with stable ids and variant attributes", () => {
    const rows = metaWearFeedRows([
      makeProduct({
        id: "prod_variant",
        variants: [
          {
            id: "var_s",
            label: "Small / Black",
            optionSize: "S",
            optionColor: "Black",
            priceCents: 3100,
            stockQuantity: 3,
          },
          {
            id: "var_m",
            label: "Medium / Clay",
            optionSize: "M",
            optionColor: "Clay",
            priceCents: 3100,
            stockQuantity: 0,
          },
        ],
      }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe(merchantFeedOfferId("prod_variant", "var_s"));
    expect(rows[0]?.id).toHaveLength(50);
    expect(rows[0]).toMatchObject({
      item_group_id: "wear_prod_variant",
      size: "S",
      color: "Black",
      availability: "in stock",
      price: "31.00 EUR",
    });
    expect(rows[1]?.id).toBe(merchantFeedOfferId("prod_variant", "var_m"));
    expect(rows[1]).toMatchObject({
      availability: "out of stock",
    });
  });

  it("skips products that do not have a usable image", () => {
    const rows = metaWearFeedRows([
      makeProduct({ id: "no_image", images: [] }),
      makeProduct({ id: "with_image" }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(merchantFeedOfferId("with_image"));
  });
});

describe("metaWearFeedCsv", () => {
  it("quotes and escapes CSV cells", () => {
    const csv = metaWearFeedCsv([
      makeProduct({
        name: 'Maker "Uniform"',
        description: "First line\nSecond line",
      }),
    ]);

    const lines = csv.split("\n");
    expect(lines[0]).toContain('"id","title","description"');
    expect(lines[1]).toContain('"Maker ""Uniform"""');
    expect(lines[1]).toContain('"Heavy cotton First line Second line"');
  });

  it("uses product price when no variants exist", () => {
    const rows = metaWearFeedRows([makeProduct({ priceCents: 4250, currency: "EUR" })]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: merchantFeedOfferId("prod_1"),
      price: "42.50 EUR",
      image_link: "https://cdn.example.com/product.jpg",
    });
    expect(rows[0]?.link.endsWith("/wear/studio-mark-tee")).toBe(true);
  });
});
