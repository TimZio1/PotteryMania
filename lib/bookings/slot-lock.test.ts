import { describe, expect, it } from "vitest";
import { releaseSlotState, reserveSlotState } from "./slot-lock";

describe("slot-lock state transitions", () => {
  it("marks a slot as full when the reservation fills capacity", () => {
    const next = reserveSlotState(
      {
        capacityReserved: 2,
        capacityTotal: 4,
        status: "open",
      },
      2
    );

    expect(next.capacityReserved).toBe(4);
    expect(next.status).toBe("full");
  });

  it("rejects overbooking for a seat type", () => {
    expect(() =>
      reserveSlotState(
        {
          capacityReserved: 1,
          capacityTotal: 8,
          status: "open",
          seatCapacities: {
            wheel: { total: 2, reserved: 1 },
            handbuilding: { total: 6, reserved: 0 },
          },
        },
        2,
        "wheel"
      )
    ).toThrow("Not enough wheel seats");
  });

  it("reopens a full slot after release", () => {
    const next = releaseSlotState(
      {
        capacityReserved: 4,
        capacityTotal: 4,
        status: "full",
      },
      1
    );

    expect(next.capacityReserved).toBe(3);
    expect(next.status).toBe("open");
  });

  it("keeps blocked slots blocked while releasing capacity", () => {
    const next = releaseSlotState(
      {
        capacityReserved: 2,
        capacityTotal: 4,
        status: "blocked",
      },
      1
    );

    expect(next.capacityReserved).toBe(1);
    expect(next.status).toBe("blocked");
  });
});
