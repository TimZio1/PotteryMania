import { describe, expect, it } from "vitest";
import {
  allCeramicCategories,
  ceramicCategoryFromSlug,
  ceramicCategoryMetaBySlug,
  ceramicCategoryMetaByValue,
} from "./ceramic-categories";

describe("ceramic categories", () => {
  it("contains exactly ten locked categories", () => {
    const categories = allCeramicCategories();
    expect(categories).toHaveLength(10);
    expect(new Set(categories.map((c) => c.slug)).size).toBe(10);
  });

  it("resolves slug to enum and metadata", () => {
    expect(ceramicCategoryFromSlug("coffee-tea")).toBe("coffee_and_tea");
    expect(ceramicCategoryMetaBySlug("ritual-artistic-pieces")?.title).toBe("Ritual & Artistic Pieces");
  });

  it("maps enum values back to category metadata", () => {
    const meta = ceramicCategoryMetaByValue("vases_and_plant_pots");
    expect(meta.slug).toBe("vases-plant-pots");
    expect(meta.title).toBe("Vases & Plant Pots");
  });
});
