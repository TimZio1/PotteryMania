import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tx: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    bookingCancellation: {
      create: vi.fn(),
    },
    bookingAuditLog: {
      create: vi.fn(),
    },
  },
  transaction: vi.fn(),
  safeReleaseCapacity: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("./slot-lock", () => ({
  safeReleaseCapacity: mocks.safeReleaseCapacity,
}));

import { cancelBooking } from "./cancel";

describe("cancelBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (cb: (tx: typeof mocks.tx) => unknown) => cb(mocks.tx));
  });

  it("releases capacity for confirmed bookings", async () => {
    mocks.tx.booking.findUnique.mockResolvedValue({
      id: "booking-1",
      bookingStatus: "confirmed",
      paymentStatus: "paid",
      slotId: "slot-1",
      participantCount: 2,
      seatType: "wheel",
      totalAmountCents: 2000,
      depositAmountCents: 2000,
      notes: null,
      cancellationPolicySnapshot: null,
      slot: {
        slotDate: new Date("2026-04-10T00:00:00.000Z"),
        startTime: "10:00",
      },
    });

    const result = await cancelBooking({
      bookingId: "booking-1",
      role: "customer",
      userId: "user-1",
    });

    expect(result).toMatchObject({ ok: true, newStatus: "cancelled_by_customer" });
    expect(mocks.safeReleaseCapacity).toHaveBeenCalledWith(mocks.tx, "slot-1", 2, "wheel");
  });

  it("does not release capacity for pending bookings", async () => {
    mocks.tx.booking.findUnique.mockResolvedValue({
      id: "booking-2",
      bookingStatus: "pending",
      paymentStatus: "pending",
      slotId: "slot-2",
      participantCount: 1,
      seatType: null,
      totalAmountCents: 1000,
      depositAmountCents: 0,
      notes: null,
      cancellationPolicySnapshot: null,
      slot: {
        slotDate: new Date("2026-04-10T00:00:00.000Z"),
        startTime: "10:00",
      },
    });

    const result = await cancelBooking({
      bookingId: "booking-2",
      role: "vendor",
      userId: "vendor-1",
    });

    expect(result).toMatchObject({ ok: true, newStatus: "cancelled_by_vendor" });
    expect(mocks.safeReleaseCapacity).not.toHaveBeenCalled();
  });

  it("rejects already-cancelled bookings", async () => {
    mocks.tx.booking.findUnique.mockResolvedValue({
      id: "booking-3",
      bookingStatus: "cancelled_by_admin",
    });

    const result = await cancelBooking({
      bookingId: "booking-3",
      role: "admin",
    });

    expect(result).toEqual({ ok: false, error: "Already cancelled" });
    expect(mocks.tx.booking.update).not.toHaveBeenCalled();
  });
});
