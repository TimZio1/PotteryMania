/**
 * Active drop identity — single source for hero, SEO, and ops naming.
 * Update here when you lock a new drop; Spreadconnect SKUs remain canonical in production.
 */
export const WEAR_ACTIVE_DROP = {
  /** Public sequence label (hero eyebrow, titles). */
  sequenceLabel: "Drop 01",
  /** Theme / story line for marketing. */
  theme: "Hand & wheel",
  /** Human launch window (marketing). */
  launchWindowLabel: "June 2026",
  /** ISO date for internal alignment (e.g. with launch countdown elsewhere). */
  launchDateIso: "2026-06-01",
  /** Short code for internal references and spreadsheet keys. */
  code: "D01",
} as const;

/** Eyebrow string: "Drop 01 · Hand & wheel" */
export function wearActiveDropEyebrow(): string {
  return `${WEAR_ACTIVE_DROP.sequenceLabel} · ${WEAR_ACTIVE_DROP.theme}`;
}

/** Default page title segment for `/wear` routes. */
export function wearDropDefaultTitle(): string {
  return `${WEAR_ACTIVE_DROP.sequenceLabel} · ${WEAR_ACTIVE_DROP.theme}`;
}
