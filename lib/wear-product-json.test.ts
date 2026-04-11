import { describe, expect, it } from "vitest";
import {
  mergeWearImageUrlsWithExistingMetadata,
  wearImagesFromJson,
} from "./wear-product-json";

describe("wear product image json", () => {
  it("reads structured wear image metadata", () => {
    const images = wearImagesFromJson([
      {
        url: "https://cdn.example.com/front-black.jpg",
        appearanceName: "Black",
        appearanceId: 12,
        perspective: "FRONT",
        imageId: 99,
      },
    ]);

    expect(images).toEqual([
      {
        url: "https://cdn.example.com/front-black.jpg",
        appearanceName: "Black",
        appearanceId: 12,
        perspective: "FRONT",
        imageId: 99,
      },
    ]);
  });

  it("preserves existing metadata when admin image urls are re-saved", () => {
    const merged = mergeWearImageUrlsWithExistingMetadata(
      ["https://cdn.example.com/front-black.jpg", "https://cdn.example.com/back-black.jpg"],
      [
        {
          url: "https://cdn.example.com/front-black.jpg",
          appearanceName: "Black",
          appearanceId: 12,
          perspective: "FRONT",
          imageId: 99,
        },
        {
          url: "https://cdn.example.com/back-black.jpg",
          appearanceName: "Black",
          appearanceId: 12,
          perspective: "BACK",
          imageId: 100,
        },
      ],
    );

    expect(merged).toEqual([
      {
        url: "https://cdn.example.com/front-black.jpg",
        appearanceName: "Black",
        appearanceId: 12,
        perspective: "FRONT",
        imageId: 99,
      },
      {
        url: "https://cdn.example.com/back-black.jpg",
        appearanceName: "Black",
        appearanceId: 12,
        perspective: "BACK",
        imageId: 100,
      },
    ]);
  });
});
