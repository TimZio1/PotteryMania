import { describe, expect, it } from "vitest";
import { normalizeGiftCardCode } from "@/lib/gift-cards/code";
import { previewGiftCardRedemption } from "@/lib/gift-cards/checkout";
import { validateGiftCardState } from "@/lib/gift-cards/validate";

describe("gift card helpers", () => {
  it("normalizes gift card codes from loose user input", () => {
    expect(normalizeGiftCardCode("pm gift ab12 cd34")).toBe("PM-GIFT-AB12-CD34");
    expect(normalizeGiftCardCode("AB12CD34")).toBe("PM-GIFT-AB12-CD34");
    expect(normalizeGiftCardCode("bad-code")).toBe("");
  });

  it("rejects inactive, inactive-yet, expired, and empty gift cards", () => {
    const base = {
      id: "gc_1",
      studioId: "studio_1",
      code: "PM-GIFT-AB12-CD34",
      name: "Studio gift card",
      description: null,
      templateId: null,
      originalValueCents: 5000,
      remainingValueCents: 5000,
      currency: "EUR",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validUntil: null,
      activatedAt: new Date("2026-01-01T00:00:00.000Z"),
      sentAt: null,
      isActive: true,
      purchaserUserId: null,
      purchaserName: null,
      purchaserEmail: null,
      recipientName: "Jamie",
      recipientEmail: "jamie@example.com",
      personalMessage: null,
      stripePaymentIntentId: null,
      stripeCheckoutSessionId: null,
      issuedByAdmin: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    expect(validateGiftCardState({ ...base, isActive: false }).ok).toBe(false);
    expect(validateGiftCardState({ ...base, activatedAt: null }).ok).toBe(false);
    expect(
      validateGiftCardState({ ...base, validUntil: new Date("2026-01-02T00:00:00.000Z") }, new Date("2026-01-03T00:00:00.000Z")).ok,
    ).toBe(false);
    expect(validateGiftCardState({ ...base, remainingValueCents: 0 }).ok).toBe(false);
    expect(validateGiftCardState(base).ok).toBe(true);
  });

  it("previews a studio-scoped gift card redemption against the checkout subtotal", async () => {
    const giftCard = {
      id: "gc_1",
      studioId: "studio_1",
      code: "PM-GIFT-AB12-CD34",
      name: "Studio gift card",
      description: null,
      templateId: null,
      originalValueCents: 5000,
      remainingValueCents: 3200,
      currency: "EUR",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validUntil: null,
      activatedAt: new Date("2026-01-01T00:00:00.000Z"),
      sentAt: null,
      isActive: true,
      purchaserUserId: null,
      purchaserName: null,
      purchaserEmail: null,
      recipientName: "Jamie",
      recipientEmail: "jamie@example.com",
      personalMessage: null,
      stripePaymentIntentId: null,
      stripeCheckoutSessionId: null,
      issuedByAdmin: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    const fakeDb = {
      giftCard: {
        findUnique: async ({ where }: { where: { code: string } }) =>
          where.code === giftCard.code ? { id: giftCard.id } : null,
      },
      giftCardRedemption: {
        findMany: async () => [],
        updateMany: async () => ({ count: 0 }),
      },
    } as const;

    const preview = await previewGiftCardRedemption(
      {
        ...fakeDb,
        giftCard: {
          ...fakeDb.giftCard,
          findUnique: async ({ where }: { where: { code: string } }) =>
            where.code === giftCard.code ? giftCard : null,
        },
      } as never,
      "pm gift ab12 cd34",
      4000,
      { studioId: "studio_1" },
    );

    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.preview.appliedCents).toBe(3200);
    expect(preview.preview.subtotalAfterGiftCard).toBe(800);
  });
});
