/**
 * Client-only: persist partner / studio attribution from `?ref=` (or `?studio=` / `?studioId=`) on `/wear/*`.
 * 30-day last-touch; cleared after successful order on `/wear/success`.
 */

const STORAGE_KEY = "potterymania_wear_partner_ref_v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type WearPartnerRefPayload = {
  studioId: string;
  at: number;
};

function isValidStudioIdToken(value: string): boolean {
  const v = value.trim();
  return /^[a-zA-Z0-9_-]{6,128}$/.test(v);
}

export function getWearPartnerReferralStudioId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<WearPartnerRefPayload>;
    if (typeof o.studioId !== "string" || !isValidStudioIdToken(o.studioId)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (typeof o.at !== "number" || Date.now() - o.at > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return o.studioId.trim();
  } catch {
    return null;
  }
}

export function setWearPartnerReferralStudioId(studioId: string): void {
  if (typeof window === "undefined") return;
  const id = studioId.trim();
  if (!isValidStudioIdToken(id)) return;
  const payload: WearPartnerRefPayload = { studioId: id, at: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearWearPartnerReferral(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
