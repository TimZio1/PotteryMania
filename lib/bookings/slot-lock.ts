import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export type SeatCapacities = Record<string, { total: number; reserved: number }>;
export type SlotState = {
  capacityReserved: number;
  capacityTotal: number;
  status: string;
  seatCapacities?: SeatCapacities | null;
};

function parseSeatCaps(raw: unknown): SeatCapacities | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as SeatCapacities;
}

export function reserveSlotState(
  slot: SlotState,
  participantCount: number,
  seatType?: string | null
): SlotState {
  if (slot.status !== "open") {
    throw new Error(`Slot is not open (status: ${slot.status})`);
  }

  const remaining = slot.capacityTotal - slot.capacityReserved;
  if (participantCount > remaining) {
    throw new Error(`Not enough capacity: ${remaining} remaining, ${participantCount} requested`);
  }

  const seatCaps = slot.seatCapacities ? structuredClone(slot.seatCapacities) : null;
  if (seatType && seatCaps && seatCaps[seatType]) {
    const sc = seatCaps[seatType];
    const seatRemaining = sc.total - sc.reserved;
    if (participantCount > seatRemaining) {
      throw new Error(`Not enough ${seatType} seats: ${seatRemaining} remaining, ${participantCount} requested`);
    }
    seatCaps[seatType].reserved += participantCount;
  }

  const capacityReserved = slot.capacityReserved + participantCount;
  const status = capacityReserved >= slot.capacityTotal ? "full" : "open";
  return { ...slot, capacityReserved, status, seatCapacities: seatCaps };
}

export function releaseSlotState(
  slot: SlotState,
  participantCount: number,
  seatType?: string | null
): SlotState {
  const seatCaps = slot.seatCapacities ? structuredClone(slot.seatCapacities) : null;
  if (seatType && seatCaps && seatCaps[seatType]) {
    seatCaps[seatType].reserved = Math.max(0, seatCaps[seatType].reserved - participantCount);
  }

  const capacityReserved = Math.max(0, slot.capacityReserved - participantCount);
  const status = slot.status === "full" && capacityReserved < slot.capacityTotal ? "open" : slot.status;
  return { ...slot, capacityReserved, status, seatCapacities: seatCaps };
}

/**
 * Atomically reserve capacity on a slot using row-level locking (FOR UPDATE).
 * Validates both total capacity and optional per-seat-type capacity.
 */
export async function safeReserveCapacity(
  tx: TxClient,
  slotId: string,
  participantCount: number,
  seatType?: string | null
): Promise<{ capacityReserved: number; capacityTotal: number; status: string }> {
  const rows: {
    id: string;
    capacity_reserved: number;
    capacity_total: number;
    status: string;
    seat_capacities: unknown;
  }[] = await tx.$queryRawUnsafe(
    `SELECT id, capacity_reserved, capacity_total, status::text, seat_capacities
     FROM booking_slots
     WHERE id = $1::uuid
     FOR UPDATE`,
    slotId
  );

  if (!rows.length) throw new Error("Slot not found");
  const row = rows[0];
  const next = reserveSlotState(
    {
      capacityReserved: row.capacity_reserved,
      capacityTotal: row.capacity_total,
      status: row.status,
      seatCapacities: parseSeatCaps(row.seat_capacities),
    },
    participantCount,
    seatType
  );

  await tx.bookingSlot.update({
    where: { id: slotId },
    data: {
      capacityReserved: next.capacityReserved,
      status: next.status as "open" | "full",
      ...(next.seatCapacities ? { seatCapacities: next.seatCapacities as Prisma.InputJsonValue } : {}),
    },
  });

  return { capacityReserved: next.capacityReserved, capacityTotal: row.capacity_total, status: next.status };
}

/**
 * Atomically release capacity on a slot. Safe: will not go below 0.
 */
export async function safeReleaseCapacity(
  tx: TxClient,
  slotId: string,
  participantCount: number,
  seatType?: string | null
): Promise<void> {
  const rows: {
    id: string;
    capacity_reserved: number;
    capacity_total: number;
    status: string;
    seat_capacities: unknown;
  }[] = await tx.$queryRawUnsafe(
    `SELECT id, capacity_reserved, capacity_total, status::text, seat_capacities
     FROM booking_slots
     WHERE id = $1::uuid
     FOR UPDATE`,
    slotId
  );

  if (!rows.length) return;
  const row = rows[0];
  const next = releaseSlotState(
    {
      capacityReserved: row.capacity_reserved,
      capacityTotal: row.capacity_total,
      status: row.status,
      seatCapacities: parseSeatCaps(row.seat_capacities),
    },
    participantCount,
    seatType
  );

  await tx.bookingSlot.update({
    where: { id: slotId },
    data: {
      capacityReserved: next.capacityReserved,
      status: next.status as "open" | "full" | "blocked" | "cancelled",
      ...(next.seatCapacities ? { seatCapacities: next.seatCapacities as Prisma.InputJsonValue } : {}),
    },
  });
}