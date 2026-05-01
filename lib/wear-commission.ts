import { prisma } from "@/lib/db";

const ADMIN_KEY_WEAR_DEFAULT_MARGIN_BPS = "wear_default_margin_bps";
const ADMIN_KEY_WEAR_MIN_MARGIN_BPS = "wear_min_margin_bps";
const ADMIN_KEY_WEAR_MAX_MARGIN_BPS = "wear_max_margin_bps";
const ADMIN_KEY_WEAR_MARGIN_LOCKED = "wear_margin_locked";

const FALLBACK_DEFAULT_MARGIN_BPS = 1500;
const FALLBACK_MIN_MARGIN_BPS = 1000;
const FALLBACK_MAX_MARGIN_BPS = 5000;

function parseBps(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return Math.round(raw);
  if (typeof raw === "string") {
    const n = parseInt(raw.trim(), 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  if (raw && typeof raw === "object" && "bps" in (raw as Record<string, unknown>)) {
    return parseBps((raw as { bps?: unknown }).bps);
  }
  return null;
}

function parseBool(raw: unknown): boolean | null {
  if (typeof raw === "boolean") return raw;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

export type WearGlobalPricingConfig = {
  defaultMarginBps: number;
  minMarginBps: number;
  maxMarginBps: number;
  marginLocked: boolean;
};

export async function resolveWearGlobalPricing(): Promise<WearGlobalPricingConfig> {
  try {
    const rows = await prisma.adminConfig.findMany({
      where: {
        configKey: {
          in: [
            ADMIN_KEY_WEAR_DEFAULT_MARGIN_BPS,
            ADMIN_KEY_WEAR_MIN_MARGIN_BPS,
            ADMIN_KEY_WEAR_MAX_MARGIN_BPS,
            ADMIN_KEY_WEAR_MARGIN_LOCKED,
          ],
        },
      },
      select: { configKey: true, configValue: true },
    });
    const byKey = new Map(rows.map((r) => [r.configKey, r.configValue]));
    return {
      defaultMarginBps: parseBps(byKey.get(ADMIN_KEY_WEAR_DEFAULT_MARGIN_BPS)) ?? FALLBACK_DEFAULT_MARGIN_BPS,
      minMarginBps: parseBps(byKey.get(ADMIN_KEY_WEAR_MIN_MARGIN_BPS)) ?? FALLBACK_MIN_MARGIN_BPS,
      maxMarginBps: parseBps(byKey.get(ADMIN_KEY_WEAR_MAX_MARGIN_BPS)) ?? FALLBACK_MAX_MARGIN_BPS,
      marginLocked: parseBool(byKey.get(ADMIN_KEY_WEAR_MARGIN_LOCKED)) ?? false,
    };
  } catch {
    return {
      defaultMarginBps: FALLBACK_DEFAULT_MARGIN_BPS,
      minMarginBps: FALLBACK_MIN_MARGIN_BPS,
      maxMarginBps: FALLBACK_MAX_MARGIN_BPS,
      marginLocked: false,
    };
  }
}

export async function updateWearGlobalPricing(
  patch: Partial<WearGlobalPricingConfig>,
): Promise<WearGlobalPricingConfig> {
  const entries: { key: string; value: string }[] = [];
  if (patch.defaultMarginBps != null) entries.push({ key: ADMIN_KEY_WEAR_DEFAULT_MARGIN_BPS, value: String(patch.defaultMarginBps) });
  if (patch.minMarginBps != null) entries.push({ key: ADMIN_KEY_WEAR_MIN_MARGIN_BPS, value: String(patch.minMarginBps) });
  if (patch.maxMarginBps != null) entries.push({ key: ADMIN_KEY_WEAR_MAX_MARGIN_BPS, value: String(patch.maxMarginBps) });
  if (patch.marginLocked != null) entries.push({ key: ADMIN_KEY_WEAR_MARGIN_LOCKED, value: String(patch.marginLocked) });

  for (const { key, value } of entries) {
    await prisma.adminConfig.upsert({
      where: { configKey: key },
      create: { configKey: key, configValue: value },
      update: { configValue: value },
    });
  }
  return resolveWearGlobalPricing();
}

export function resolveStudioMarginBps(
  studioMarginBps: number,
  global: WearGlobalPricingConfig,
): number {
  if (global.marginLocked) return global.defaultMarginBps;
  return Math.max(global.minMarginBps, Math.min(global.maxMarginBps, studioMarginBps));
}

/** Marketing / UI label: basis points → percent (e.g. 1500 → "15.0%"). */
export function formatWearMarginPercentFromBps(bps: number): string {
  if (!Number.isFinite(bps)) return "0.0%";
  return `${(bps / 100).toFixed(1)}%`;
}

export function calculateWearPrice(basePriceCents: number, marginBps: number): number {
  const raw = basePriceCents + Math.round((basePriceCents * marginBps) / 10000);
  return smartRound(raw);
}

export function calculateWearMarginCents(basePriceCents: number, finalPriceCents: number): number {
  return finalPriceCents - basePriceCents;
}

/** Round to nearest attractive price point: X9, X5, or X0. */
function smartRound(cents: number): number {
  if (cents <= 0) return cents;
  const euros = cents / 100;
  if (euros < 5) return cents;
  const rounded = Math.round(euros);
  const lastDigit = rounded % 10;
  if (lastDigit >= 7) return (rounded - lastDigit + 9) * 100;
  if (lastDigit >= 3) return (rounded - lastDigit + 5) * 100;
  return (rounded - lastDigit) * 100;
}
