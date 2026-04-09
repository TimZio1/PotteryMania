import { describe, expect, it } from "vitest";
import { isWearCategory, resolveWearCategory, wearCategoryLabel } from "./wear-categories";

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
});
