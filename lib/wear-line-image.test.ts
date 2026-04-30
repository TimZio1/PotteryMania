import { describe, expect, it } from "vitest";
import type { WearCatalogImage } from "@/lib/wear-product-json";
import { normalizeWearAppearanceLabel, pickWearLineCatalogImage } from "@/lib/wear-line-image";

describe("normalizeWearAppearanceLabel", () => {
  it("lowercases and trims", () => {
    expect(normalizeWearAppearanceLabel("  Forest  ")).toBe("forest");
    expect(normalizeWearAppearanceLabel(null)).toBe("");
  });
});

describe("pickWearLineCatalogImage", () => {
  const black: WearCatalogImage = {
    url: "https://example.com/black.jpg",
    appearanceName: "black",
    appearanceId: null,
    perspective: "FRONT",
    imageId: 1,
  };
  const forest: WearCatalogImage = {
    url: "https://example.com/forest.jpg",
    appearanceName: "forest",
    appearanceId: null,
    perspective: "FRONT",
    imageId: 2,
  };

  it("returns image matching optionColor", () => {
    const picked = pickWearLineCatalogImage([forest, black], { optionColor: "Black", label: "XS · black" });
    expect(picked?.url).toBe(black.url);
  });

  it("returns image matching label color when optionColor missing", () => {
    const picked = pickWearLineCatalogImage([black, forest], { label: "XS · forest" });
    expect(picked?.url).toBe(forest.url);
  });

  it("matches longer appearance name to shorter option color", () => {
    const forestLong: WearCatalogImage = {
      ...forest,
      appearanceName: "Forest green",
    };
    const picked = pickWearLineCatalogImage([black, forestLong], { optionColor: "forest" });
    expect(picked?.url).toBe(forestLong.url);
  });

  it("falls back to first sorted image when no appearance metadata", () => {
    const plain: WearCatalogImage = {
      url: "https://example.com/only.jpg",
      appearanceName: null,
      appearanceId: null,
      perspective: "FRONT",
      imageId: 1,
    };
    const picked = pickWearLineCatalogImage([plain], { optionColor: "navy", label: "M · navy" });
    expect(picked?.url).toBe(plain.url);
  });
});
