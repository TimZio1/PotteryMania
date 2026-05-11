export type WearCartMetaLine = {
  productId: string;
  variantId?: string | null;
};

export type WearCartMetaProduct = {
  id: string;
  metaContentId?: string | null;
  variants: Array<{
    id: string;
    metaContentId?: string | null;
  }>;
};

function cleanMetaContentId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolveWearCartMetaContentIds(
  lines: readonly WearCartMetaLine[],
  productsById: ReadonlyMap<string, WearCartMetaProduct>,
): string[] {
  return lines.map((line) => {
    const product = productsById.get(line.productId);
    const variantId = line.variantId?.trim();

    if (variantId) {
      const variant = product?.variants.find((candidate) => candidate.id === variantId);
      return cleanMetaContentId(variant?.metaContentId) ?? variantId;
    }

    return cleanMetaContentId(product?.metaContentId) ?? line.productId;
  });
}
