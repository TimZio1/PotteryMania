"use client";

/**
 * Captures the cart state at the moment of "Pay → checkout" so we can fire a Meta Pixel `Purchase`
 * event on the success page (after the Stripe redirect round-trip). Without this snapshot, the
 * success page only knows the Stripe `session_id` — not the value, currency, or content IDs —
 * which means Pixel `Purchase` would have to wait for a server CAPI call.
 *
 * Stored in `sessionStorage` (not `localStorage`) so it auto-clears when the tab closes and never
 * leaks to other browser sessions. Cleared explicitly after the Pixel fires on /wear/success.
 */
const KEY = "pm:wear-checkout-snapshot";

export type WearCheckoutSnapshot = {
  /** Stripe session_id for browser ↔ CAPI dedup. */
  sessionId?: string;
  contentIds: string[];
  /** Major-currency value (e.g. 24.50 for €24.50). */
  value: number;
  currency: string;
  /** Total units across all lines. */
  numItems: number;
  /** Wall-clock ms — used to drop stale snapshots if the user wanders back to /wear/success days later. */
  ts: number;
};

const MAX_AGE_MS = 30 * 60 * 1000;

export function setWearCheckoutSnapshot(snapshot: WearCheckoutSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

export function readWearCheckoutSnapshot(): WearCheckoutSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WearCheckoutSnapshot>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.value !== "number" || typeof parsed.currency !== "string") return null;
    if (!Array.isArray(parsed.contentIds)) return null;
    if (typeof parsed.ts !== "number" || Date.now() - parsed.ts > MAX_AGE_MS) return null;
    return {
      sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : undefined,
      contentIds: parsed.contentIds.filter((id): id is string => typeof id === "string"),
      value: parsed.value,
      currency: parsed.currency,
      numItems: typeof parsed.numItems === "number" ? parsed.numItems : 1,
      ts: parsed.ts,
    };
  } catch {
    return null;
  }
}

export function clearWearCheckoutSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* non-fatal */
  }
}
