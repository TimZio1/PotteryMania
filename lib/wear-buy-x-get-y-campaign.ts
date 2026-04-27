export const WEAR_BUY_X_GET_Y_CAMPAIGN = {
  buyQuantity: 4,
  freeQuantity: 1,
  label: "Buy 4, get 1 free",
} as const;

export type WearCampaignLine = {
  key: string;
  quantity: number;
  unitCents: number;
};

export type WearCampaignDiscount = {
  discountCents: number;
  freeItemCount: number;
  freeUnitsByKey: Record<string, number>;
  discountByKey: Record<string, number>;
  lineTotalAfterByKey: Record<string, number>;
};

function lineTotal(line: WearCampaignLine): number {
  return line.unitCents * line.quantity;
}

/**
 * Automatic Buy 4, Get 1 Free campaign.
 *
 * Every complete group of five units earns one free unit, and the free unit is
 * always chosen from the cheapest eligible units in the cart. For 10 items, the
 * two cheapest units are free; for 15, the three cheapest, etc.
 */
export function computeWearBuyXGetYDiscount(lines: WearCampaignLine[]): WearCampaignDiscount {
  const groupSize = WEAR_BUY_X_GET_Y_CAMPAIGN.buyQuantity + WEAR_BUY_X_GET_Y_CAMPAIGN.freeQuantity;
  const units: { key: string; unitCents: number }[] = [];
  const freeUnitsByKey: Record<string, number> = {};
  const discountByKey: Record<string, number> = {};
  const lineTotalAfterByKey: Record<string, number> = {};

  for (const line of lines) {
    freeUnitsByKey[line.key] = 0;
    discountByKey[line.key] = 0;
    lineTotalAfterByKey[line.key] = lineTotal(line);
    for (let i = 0; i < line.quantity; i++) {
      units.push({ key: line.key, unitCents: line.unitCents });
    }
  }

  const freeItemCount = Math.floor(units.length / groupSize) * WEAR_BUY_X_GET_Y_CAMPAIGN.freeQuantity;
  if (freeItemCount <= 0) {
    return { discountCents: 0, freeItemCount: 0, freeUnitsByKey, discountByKey, lineTotalAfterByKey };
  }

  units.sort((a, b) => a.unitCents - b.unitCents);
  let discountCents = 0;
  for (let i = 0; i < freeItemCount; i++) {
    const freeUnit = units[i]!;
    freeUnitsByKey[freeUnit.key] = (freeUnitsByKey[freeUnit.key] ?? 0) + 1;
    discountByKey[freeUnit.key] = (discountByKey[freeUnit.key] ?? 0) + freeUnit.unitCents;
    discountCents += freeUnit.unitCents;
  }

  for (const line of lines) {
    lineTotalAfterByKey[line.key] = Math.max(0, lineTotal(line) - (discountByKey[line.key] ?? 0));
  }

  return { discountCents, freeItemCount, freeUnitsByKey, discountByKey, lineTotalAfterByKey };
}
