export type SeatCapacitiesJson = Record<string, { total: number; reserved: number }>;

export function seatTypeKeysFromSlot(seatCapacities: unknown): string[] {
  if (!seatCapacities || typeof seatCapacities !== "object") return [];
  return Object.keys(seatCapacities as object).filter((k) => k.length > 0);
}

/** When slot defines seat pools, customer must pick one of the keys. */
export function validateSeatTypeRequired(seatCapacities: unknown, seatType: string | null | undefined): string | null {
  const keys = seatTypeKeysFromSlot(seatCapacities);
  if (keys.length === 0) return null;
  if (!seatType || !keys.includes(seatType)) {
    return `seatType required; allowed: ${keys.join(", ")}`;
  }
  return null;
}

export function seatTypeCapacityError(
  seatCapacities: unknown,
  seatType: string | null,
  participantCount: number,
  sameCartItemParticipants: number
): string | null {
  if (!seatType) return null;
  const caps = seatCapacities as SeatCapacitiesJson | null;
  if (!caps || !caps[seatType]) return null;
  const sc = caps[seatType];
  const remaining = sc.total - sc.reserved + sameCartItemParticipants;
  if (participantCount > remaining) {
    return `Not enough ${seatType} seats`;
  }
  return null;
}
