/** Parse "HH:mm" or "H:mm" to minutes from midnight. */
export function timeToMinutes(t: string): number {
  const [h, m = "0"] = t.trim().split(":");
  const hh = parseInt(h!, 10);
  const mm = parseInt(m, 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
  return hh * 60 + mm;
}

/** Half-open intervals [start, end): touching ends (10:00 / 10:00) do not overlap. */
export function slotTimesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const a0 = timeToMinutes(startA);
  const a1 = timeToMinutes(endA);
  const b0 = timeToMinutes(startB);
  const b1 = timeToMinutes(endB);
  return a0 < b1 && b0 < a1;
}

/** Slot ids that overlap at least one other slot on the same calendar day (same studio schedule). */
export function overlappingSlotIdsForDay(
  slots: { id: string; startTime: string; endTime: string }[],
): Set<string> {
  const bad = new Set<string>();
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]!;
      const b = slots[j]!;
      if (slotTimesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
        bad.add(a.id);
        bad.add(b.id);
      }
    }
  }
  return bad;
}
