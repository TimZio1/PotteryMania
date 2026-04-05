import { prisma } from "@/lib/db";

type CacheEntry = { expires: number; value: boolean };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

/** Known DB-backed kill switches (seeded / created in Hyperadmin → System). */
export const RUNTIME_FLAG_KEYS = {
  bookingCheckoutEnabled: "booking_checkout_enabled",
  marketplaceCheckoutEnabled: "marketplace_checkout_enabled",
} as const;

/**
 * When a row exists, `isActive` controls the gate. When missing, `defaultWhenMissing` applies
 * (so new deploys stay open until Hyperadmin creates a flag).
 */
export async function isRuntimeFlagEnabled(flagKey: string, defaultWhenMissing = true): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(flagKey);
  if (hit && hit.expires > now) return hit.value;

  const row = await prisma.featureFlag.findUnique({
    where: { flagKey },
    select: { isActive: true },
  });
  const value = row ? row.isActive : defaultWhenMissing;
  cache.set(flagKey, { value, expires: now + TTL_MS });
  return value;
}

export function clearRuntimeFlagCache(flagKey?: string) {
  if (flagKey) cache.delete(flagKey);
  else cache.clear();
}
