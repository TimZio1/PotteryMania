import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCheckoutLineRowsFromCart } from "./checkout-line-rows";

const commissionMocks = vi.hoisted(() => ({
  resolveCommissionBps: vi.fn(),
}));

vi.mock("@/lib/commission", () => ({
  resolveCommissionBps: (...args: unknown[]) => commissionMocks.resolveCommissionBps(...args),
  commissionCentsFromLine: (lineTotalCents: number, basisPoints: number) =>
    Math.floor((lineTotalCents * basisPoints) / 10000),
}));

describe("checkout line rows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commissionMocks.resolveCommissionBps.mockReset();
    commissionMocks.resolveCommissionBps.mockImplementation(async (_studioId: string, itemType: string) => {
      if (itemType === "product") return 300;
      return 500;
    });
  });

  it("returns 409 for multi-vendor cart without explicit studio scope", async () => {
    const cart = {
      items: [
        {
          id: "ci_1",
          itemType: "product",
          vendorId: "studio_1",
          vendor: { displayName: "Studio 1" },
        },
        {
          id: "ci_2",
          itemType: "product",
          vendorId: "studio_2",
          vendor: { displayName: "Studio 2" },
        },
      ],
    };
    const result = await buildCheckoutLineRowsFromCart(cart as never);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected multi-vendor error");
    expect(result.status).toBe(409);
    expect(result.multiVendorStudios).toHaveLength(2);
  });

  it("computes product line commission and vendor amount", async () => {
    const cart = {
      items: [
        {
          id: "ci_prod",
          itemType: "product",
          vendorId: "studio_1",
          vendor: { displayName: "Clay House" },
          productId: "prod_1",
          quantity: 2,
          priceSnapshotCents: 4999,
          product: {
            id: "prod_1",
            title: "Mug",
            status: "active",
            studio: { status: "approved" },
            stockStatus: "in_stock",
            stockQuantity: 10,
            salePriceCents: null,
            priceCents: 4999,
            weightGrams: 300,
          },
        },
      ],
    };
    const result = await buildCheckoutLineRowsFromCart(cart as never);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(result.subtotal).toBe(9998);
    expect(result.commissionTotal).toBe(299); // floor(9998 * 300 / 10000)
    expect(result.lineRows[0]?.vendorCents).toBe(9699);
    expect(result.totalWeightGrams).toBe(600);
  });

  it("computes booking deposit commission from charged amount", async () => {
    const cart = {
      items: [
        {
          id: "ci_book",
          itemType: "booking",
          vendorId: "studio_1",
          vendor: { displayName: "Clay House" },
          experienceId: "exp_1",
          slotId: "slot_1",
          participantCount: 2,
          seatType: null,
          policySnapshot: null,
          priceSnapshotCents: 5000,
          experience: {
            id: "exp_1",
            title: "Wheel Class",
            status: "active",
            visibility: "public",
            studio: { status: "approved" },
            minimumParticipants: 1,
            maximumParticipants: 8,
            priceCents: 5000,
            bookingDepositBps: 2500,
          },
          slot: {
            id: "slot_1",
            status: "open",
            capacityTotal: 10,
            capacityReserved: 2,
            seatCapacities: null,
          },
        },
      ],
    };
    const result = await buildCheckoutLineRowsFromCart(cart as never);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    const row = result.lineRows[0];
    expect(row?.fullLineCents).toBe(10000);
    expect(row?.chargedLineCents).toBe(2500);
    expect(row?.commissionCents).toBe(125); // floor(2500 * 500 / 10000)
    expect(row?.vendorCents).toBe(2375);
    expect(row?.stripeQuantity).toBe(1); // deposit line is collapsed to one Stripe unit
  });
});
