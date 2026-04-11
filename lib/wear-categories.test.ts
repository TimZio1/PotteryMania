import { describe, expect, it } from "vitest";
import {
  isWearCategory,
  isWearTopSubcategory,
  resolveWearCatalogCategory,
  resolveWearCategory,
  resolveWearProviderCategory,
  resolveWearTopSubcategory,
  wearCategoryLabel,
  wearTopSubcategoryLabel,
} from "./wear-categories";

describe("wear category resolver", () => {
  it("classifies tops from tee/t-shirt keywords", () => {
    expect(resolveWearCategory({ name: "Studio Mark Tee" })).toBe("tops");
    expect(resolveWearCategory({ name: "Handmade T-Shirt" })).toBe("tops");
  });

  it("classifies hoodies and sweatshirts", () => {
    expect(resolveWearCategory({ name: "Build Space Hoodie" })).toBe("hoodies");
    expect(resolveWearCategory({ subtitle: "Heavyweight crewneck sweatshirt" })).toBe("hoodies");
  });

  it("classifies headwear", () => {
    expect(resolveWearCategory({ name: "Quiet Kiln Cap" })).toBe("headwear");
  });

  it("classifies accessories", () => {
    expect(resolveWearCategory({ name: "Studio Tote Bag" })).toBe("accessories");
  });

  it("falls back to other when no keywords match", () => {
    expect(resolveWearCategory({ name: "Limited Drop 01" })).toBe("other");
  });

  it("validates category literals and labels", () => {
    expect(isWearCategory("tops")).toBe(true);
    expect(isWearCategory("foo")).toBe(false);
    expect(wearCategoryLabel("headwear")).toBe("Headwear");
  });

  it("prefers stored Spreadconnect provider category data when available", () => {
    const resolved = resolveWearCatalogCategory({
      name: "Studio Mark Tee",
      spreadconnectProductTypeName: "Premium Unisex Hoodie",
      spreadconnectCategoryData: {
        categories: [
          {
            id: "outerwear",
            translation: "Outerwear",
            children: [{ id: "hoodies", translation: "Hoodies", children: [] }],
          },
        ],
      },
    });

    expect(resolved.categorySlug).toBe("hoodies");
    expect(resolved.categoryLabel).toBe("Hoodies");
    expect(resolved.source).toBe("spreadconnect");
    expect(resolved.fallbackCategory).toBe("hoodies");
  });

  it("falls back to product type name when category tree data is missing", () => {
    expect(resolveWearProviderCategory({ spreadconnectProductTypeName: "Snapback Cap" })).toEqual({
      slug: "snapback-cap",
      label: "Snapback Cap",
      path: ["Snapback Cap"],
    });
  });
});

describe("wear tops / tee subcategories", () => {
  it("resolves short sleeve vs long sleeve vs other", () => {
    expect(resolveWearTopSubcategory({ name: "Studio Mark Tee" })).toBe("short_sleeve");
    expect(resolveWearTopSubcategory({ name: "Hands in the clay · longsleeve" })).toBe("long_sleeve");
    expect(resolveWearTopSubcategory({ subtitle: "Classic long sleeve tee" })).toBe("long_sleeve");
    expect(resolveWearTopSubcategory({ name: "Summer tank" })).toBe("tank");
    expect(resolveWearTopSubcategory({ name: "Studio polo" })).toBe("polo");
    expect(resolveWearTopSubcategory({ name: "Minimal top" })).toBe("other");
  });

  it("validates subcategory query literals and labels", () => {
    expect(isWearTopSubcategory("short_sleeve")).toBe(true);
    expect(isWearTopSubcategory("tees")).toBe(false);
    expect(wearTopSubcategoryLabel("tank")).toBe("Tanks & sleeveless");
  });
});
