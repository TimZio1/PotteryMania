import type { Prisma } from "@prisma/client";

type SlotCapacity = {
  status: string;
  capacityTotal: number;
  capacityReserved: number;
  seatCapacities: Prisma.JsonValue;
};

/** Whether a slot can accept this booking (same rules as capacity reservation). */
export function slotCanAcceptReschedule(
  slot: SlotCapacity,
  participantCount: number,
  seatType: string | null | undefined
): boolean {
  return slotSpotsForReschedule(slot, participantCount, seatType).ok;
}

/** Spots left for display (min of total and seat-type bucket when applicable). */
export function slotSpotsForReschedule(
  slot: SlotCapacity,
  participantCount: number,
  seatType: string | null | undefined
): { ok: boolean; spotsLeft: number } {
  if (slot.status !== "open") return { ok: false, spotsLeft: 0 };
  const totalRem = slot.capacityTotal - slot.capacityReserved;
  if (participantCount > totalRem) return { ok: false, spotsLeft: Math.max(0, totalRem) };

  if (
    seatType &&
    slot.seatCapacities &&
    typeof slot.seatCapacities === "object" &&
    !Array.isArray(slot.seatCapacities)
  ) {
    const caps = slot.seatCapacities as Record<string, { total: number; reserved: number }>;
    const sc = caps[seatType];
    if (!sc) return { ok: false, spotsLeft: 0 };
    const seatRem = sc.total - sc.reserved;
    if (participantCount > seatRem) return { ok: false, spotsLeft: Math.min(totalRem, Math.max(0, seatRem)) };
    return { ok: true, spotsLeft: Math.min(totalRem, seatRem) };
  }

  return { ok: true, spotsLeft: totalRem };
}
