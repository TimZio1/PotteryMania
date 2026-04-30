export const WEAR_CART_STORAGE_KEY = "potterymania_wear_cart_v1";

/** Same-tab updates (storage event only fires across tabs). */
export const WEAR_CART_CHANGED_EVENT = "potterymania-wear-cart-changed";

/** Fired only after a successful add from `WearAddToCartButton` (for toast / analytics UX). */
export const WEAR_CART_ITEM_ADDED_EVENT = "potterymania-wear-cart-item-added";

export type WearCartItemAddedDetail = {
  productName?: string;
  viewCartHref?: string;
  /** Same optimised URL shown in the PDP hero (color / angle the shopper picked). */
  lineImageSrc?: string;
  /** Variant line as on the PDP, e.g. `M · Navy`. */
  variantSummary?: string;
  /** Units added in this action (toast shows when more than one). */
  quantity?: number;
};

export function notifyWearItemAddedToCart(detail: WearCartItemAddedDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<WearCartItemAddedDetail>(WEAR_CART_ITEM_ADDED_EVENT, { detail }));
}

export function notifyWearCartChanged() {
  if (typeof window === "undefined") return;
  const count = parseWearCart(localStorage.getItem(WEAR_CART_STORAGE_KEY)).reduce((sum, line) => sum + line.quantity, 0);
  document.cookie = `wear_cart_count=${count}; path=/; max-age=2592000; samesite=lax`;
  window.dispatchEvent(new Event(WEAR_CART_CHANGED_EVENT));
}

export type WearCartLine = {
  productId: string;
  /** Required when the product has active variants. */
  variantId?: string | null;
  quantity: number;
};

export function cartLineKey(line: WearCartLine): string {
  const v = (line.variantId ?? "").trim();
  return `${line.productId.trim()}::${v}`;
}

export function parseWearCart(raw: string | null): WearCartLine[] {
  if (!raw?.trim()) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: WearCartLine[] = [];
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const productId = (row as { productId?: unknown }).productId;
      const quantity = (row as { quantity?: unknown }).quantity;
      const variantRaw = (row as { variantId?: unknown }).variantId;
      if (typeof productId !== "string" || !productId.trim()) continue;
      const q = typeof quantity === "number" ? Math.floor(quantity) : parseInt(String(quantity), 10);
      if (!Number.isFinite(q) || q < 1 || q > 99) continue;
      const variantId =
        typeof variantRaw === "string" && variantRaw.trim().length > 0 ? variantRaw.trim() : null;
      out.push({ productId: productId.trim(), variantId, quantity: q });
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeWearCart(lines: WearCartLine[]): string {
  return JSON.stringify(
    lines.map((l) => ({
      productId: l.productId,
      ...(l.variantId ? { variantId: l.variantId } : {}),
      quantity: l.quantity,
    })),
  );
}
