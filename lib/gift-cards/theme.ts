const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export const DEFAULT_GIFT_CARD_BG = "#F3E7DA";
export const DEFAULT_GIFT_CARD_TEXT = "#2C1810";

export function normalizeHexColor(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  if (!HEX_COLOR_RE.test(value)) return null;
  return value.toUpperCase();
}

export function normalizeGiftCardImageUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
