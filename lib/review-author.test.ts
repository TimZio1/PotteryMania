import { describe, expect, it } from "vitest";
import { reviewAuthorLabel } from "@/lib/review-author";

describe("reviewAuthorLabel", () => {
  it("returns full name when available", () => {
    expect(
      reviewAuthorLabel({
        customerProfile: { fullName: "Ari Potter" },
      }),
    ).toBe("Ari Potter");
  });

  it("falls back to verified customer when name is missing", () => {
    expect(reviewAuthorLabel({ customerProfile: { fullName: null } })).toBe("Verified customer");
    expect(reviewAuthorLabel(null)).toBe("Verified customer");
  });
});
