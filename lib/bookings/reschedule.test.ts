import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tx: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    bookingSlot: {
      findUnique: vi.fn(),
    },
    bookingReschedule: {
      create: vi.fn(),
    },
    bookingAuditLog: {
      create: vi.fn(),
    },
  },
  transaction: vi.fn(),
  safeReserveCapacity: vi.fn(),
  safeReleaseCapacity: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("./slot-lock", () => ({
  safeReserveCapacity: mocks.safeReserveCapacity,
  safeReleaseCapacity: mocks.safeReleaseCapacity,
}));

import { rescheduleBooking } from "./reschedule";

describe("rescheduleBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (cb: (tx: typeof mocks.tx) => unknown) => cb(mocks.tx));
  });

  it("reserves the new slot before releasing the old one", async () => {
    const calls: string[] = [];
    mocks.tx.booking.findUnique.mockResolvedValue({
      id: "booking-1",
      bookingStatus: "confirmed",
      paymentStatus: "paid",
      experienceId: "exp-1",
      slotId: "slot-old",
      participantCount: 2,
      seatType: "wheel",
      slot: {},
    });
    mocks.tx.bookingSlot.findUnique.mockResolvedValue({
      id: "slot-new",
      experienceId: "exp-1",
    });
    mocks.safeReserveCapacity.mockImplementation(async () => {
      calls.push("reserve");
    });
    mocks.safeReleaseCapacity.mockImplementation(async () => {
      calls.push("release");
    });

    const result = await rescheduleBooking({
      bookingId: "booking-1",
      newSlotId: "slot-new",
      role: "vendor",
      userId: "vendor-1",
    });

    expect(result).toMatchObject({ ok: true, oldSlotId: "slot-old", newSlotId: "slot-new" });
    expect(calls).toEqual(["reserve", "release"]);
    expect(mocks.safeReserveCapacity).toHaveBeenCalledWith(mocks.tx, "slot-new", 2, "wheel");
    expect(mocks.safeReleaseCapacity).toHaveBeenCalledWith(mocks.tx, "slot-old", 2, "wheel");
  });

  it("does not release the old slot if reserving the new slot fails", async () => {
    mocks.tx.booking.findUnique.mockResolvedValue({
      id: "booking-2",
      bookingStatus: "confirmed",
      paymentStatus: "paid",
      experienceId: "exp-1",
      slotId: "slot-old",
      participantCount: 3,
      seatType: null,
      slot: {},
    });
    mocks.tx.bookingSlot.findUnique.mockResolvedValue({
      id: "slot-new",
      experienceId: "exp-1",
    });
    mocks.safeReserveCapacity.mockRejectedValue(new Error("Not enough capacity"));

    const result = await rescheduleBooking({
      bookingId: "booking-2",
      newSlotId: "slot-new",
      role: "customer",
      userId: "user-1",
    });

    expect(result).toEqual({ ok: false, error: "Not enough capacity" });
    expect(mocks.safeReleaseCapacity).not.toHaveBeenCalled();
    expect(mocks.tx.booking.update).not.toHaveBeenCalled();
  });

  it("parallel reschedules into the same slot: one succeeds when the second reserve fails (contention)", async () => {
    mocks.tx.booking.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      bookingStatus: "confirmed",
      paymentStatus: "paid",
      experienceId: "exp-1",
      slotId: `old-${where.id}`,
      participantCount: 1,
      seatType: null,
      slot: {},
    }));
    mocks.tx.bookingSlot.findUnique.mockResolvedValue({
      id: "slot-hot",
      experienceId: "exp-1",
    });
    let reserveCalls = 0;
    mocks.safeReserveCapacity.mockImplementation(async () => {
      reserveCalls += 1;
      if (reserveCalls >= 2) {
        throw new Error("Not enough capacity");
      }
    });

    const [a, b] = await Promise.all([
      rescheduleBooking({
        bookingId: "booking-a",
        newSlotId: "slot-hot",
        role: "customer",
        userId: "user-a",
      }),
      rescheduleBooking({
        bookingId: "booking-b",
        newSlotId: "slot-hot",
        role: "customer",
        userId: "user-b",
      }),
    ]);

    const successes = [a, b].filter((r) => r.ok);
    const failures = [a, b].filter((r) => !r.ok);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ ok: false, error: "Not enough capacity" });
  });
});
