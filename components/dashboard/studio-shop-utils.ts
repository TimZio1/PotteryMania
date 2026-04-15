export type EditableProductImage = {
  imageUrl: string;
  altText: string;
  isPrimary: boolean;
};

export type EditableVariant = {
  name: string;
  sku: string | null;
  priceCents: number | null;
  stockQuantity: number | null;
  sortOrder: number;
};

export function serializeVariantsForEditor(variants: EditableVariant[]) {
  if (!variants.length) return "";
  return JSON.stringify(variants, null, 2);
}

export function parseVariantsFromEditor(raw: string): { ok: true; value: EditableVariant[] } | { ok: false; error: string } {
  const input = raw.trim();
  if (!input) return { ok: true, value: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return { ok: false, error: "Variants must be valid JSON" };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Variants JSON must be an array" };
  }
  const rows: EditableVariant[] = [];
  for (let index = 0; index < parsed.length; index += 1) {
    const row = parsed[index];
    if (!row || typeof row !== "object") return { ok: false, error: `Variant #${index + 1} must be an object` };
    const rec = row as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    if (!name) return { ok: false, error: `Variant #${index + 1} name is required` };
    const priceCents =
      rec.priceCents == null ? null : typeof rec.priceCents === "number" ? Math.floor(rec.priceCents) : Number.NaN;
    if (Number.isNaN(priceCents) || (priceCents != null && priceCents < 0)) {
      return { ok: false, error: `Variant #${index + 1} has invalid priceCents` };
    }
    const stockQuantity =
      rec.stockQuantity == null
        ? null
        : typeof rec.stockQuantity === "number"
          ? Math.floor(rec.stockQuantity)
          : Number.NaN;
    if (Number.isNaN(stockQuantity) || (stockQuantity != null && stockQuantity < 0)) {
      return { ok: false, error: `Variant #${index + 1} has invalid stockQuantity` };
    }
    rows.push({
      name,
      sku: typeof rec.sku === "string" ? rec.sku.trim() || null : null,
      priceCents,
      stockQuantity,
      sortOrder: typeof rec.sortOrder === "number" ? Math.floor(rec.sortOrder) : index,
    });
  }
  return { ok: true, value: rows };
}

export function normalizePrimaryImage(images: EditableProductImage[]) {
  if (images.length === 0) return images;
  const hasPrimary = images.some((image) => image.isPrimary);
  if (hasPrimary) return images;
  return images.map((image, idx) => ({ ...image, isPrimary: idx === 0 }));
}

export function moveImage(images: EditableProductImage[], index: number, direction: "up" | "down") {
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= images.length) return images;
  const next = [...images];
  const current = next[index];
  next[index] = next[target];
  next[target] = current;
  return next;
}
