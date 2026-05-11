import { describe, expect, it } from "vitest";
import { resolveWearCartMetaContentIds, type WearCartMetaProduct } from "@/lib/wear-cart-meta";

describe("resolveWearCartMetaContentIds", () => {
  it("uses Meta catalog offer ids for variant and no-variant wear cart lines", () => {
    const products = new Map<string, WearCartMetaProduct>([
      [
        "prod_variant",
        {
          id: "prod_variant",
          metaContentId: "product-offer-id",
          variants: [
            { id: "variant_s", metaContentId: "variant-offer-id-s" },
            { id: "variant_m", metaContentId: "variant-offer-id-m" },
          ],
        },
      ],
      [
        "prod_plain",
        {
          id: "prod_plain",
          metaContentId: "plain-product-offer-id",
          variants: [],
        },
      ],
    ]);

    expect(
      resolveWearCartMetaContentIds(
        [
          { productId: "prod_variant", variantId: "variant_s" },
          { productId: "prod_plain" },
        ],
        products,
      ),
    ).toEqual(["variant-offer-id-s", "plain-product-offer-id"]);
  });

  it("falls back to cart ids if catalog metadata is missing", () => {
    const products = new Map<string, WearCartMetaProduct>([
      [
        "prod_variant",
        {
          id: "prod_variant",
          variants: [{ id: "variant_s" }],
        },
      ],
    ]);

    expect(
      resolveWearCartMetaContentIds(
        [
          { productId: "prod_variant", variantId: "variant_s" },
          { productId: "missing_product" },
        ],
        products,
      ),
    ).toEqual(["variant_s", "missing_product"]);
  });
});
