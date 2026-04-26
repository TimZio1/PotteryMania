import type { Prisma } from "@prisma/client";
import { buildAbsoluteUrl } from "@/lib/seo";
import { resolveWearCatalogCategory } from "@/lib/wear-categories";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";

export const META_WEAR_FEED_HEADERS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
  "google_product_category",
  "product_type",
  "item_group_id",
  "size",
  "color",
] as const;

export type MetaWearFeedVariant = {
  id: string;
  label: string;
  optionSize: string | null;
  optionColor: string | null;
  priceCents: number | null;
  stockQuantity: number | null;
};

export type MetaWearFeedProduct = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  priceCents: number;
  currency: string;
  images: Prisma.JsonValue;
  variants: MetaWearFeedVariant[];
  spreadconnectProductTypeName?: string | null;
  spreadconnectCategoryData?: Prisma.JsonValue | null;
};

type MetaWearFeedRow = Record<(typeof META_WEAR_FEED_HEADERS)[number], string>;

function csvCell(value: string): string {
  return `"${value.replaceAll(`"`, `""`)}"`;
}

function csvLine(values: string[]): string {
  return values.map(csvCell).join(",");
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function formatMetaPrice(priceCents: number, currency: string): string {
  const amount = (priceCents / 100).toFixed(2);
  return `${amount} ${currency.trim().toUpperCase() || "EUR"}`;
}

function availabilityForStock(stockQuantity: number | null): string {
  if (stockQuantity == null) return "in stock";
  return stockQuantity > 0 ? "in stock" : "out of stock";
}

function googleProductCategoryForProduct(product: MetaWearFeedProduct): string {
  const category = resolveWearCatalogCategory({
    slug: product.slug,
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    spreadconnectProductTypeName: product.spreadconnectProductTypeName,
    spreadconnectCategoryData: product.spreadconnectCategoryData,
  });

  switch (category.fallbackCategory) {
    case "tops":
      return "Apparel & Accessories > Clothing > Shirts & Tops";
    case "hoodies":
      return "Apparel & Accessories > Clothing";
    case "headwear":
      return "Apparel & Accessories > Clothing Accessories > Hats";
    case "accessories":
      return "Apparel & Accessories > Handbags, Wallets & Cases";
    default:
      return "Apparel & Accessories";
  }
}

function productTypeForProduct(product: MetaWearFeedProduct): string {
  const category = resolveWearCatalogCategory({
    slug: product.slug,
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    spreadconnectProductTypeName: product.spreadconnectProductTypeName,
    spreadconnectCategoryData: product.spreadconnectCategoryData,
  });

  return category.providerCategory?.path.join(" > ") || category.categoryLabel;
}

function rowId(productId: string, variantId?: string): string {
  return variantId ? `wear_${productId}_${variantId}` : `wear_${productId}`;
}

function titleForRow(product: MetaWearFeedProduct, variant?: MetaWearFeedVariant): string {
  const base = normalizeText(product.name);
  if (!variant) return base;
  const label = normalizeText(variant.label);
  return label ? `${base} - ${label}` : base;
}

function descriptionForProduct(product: MetaWearFeedProduct): string {
  const parts = [normalizeText(product.subtitle), normalizeText(product.description)].filter(Boolean);
  return parts.join(" ").trim();
}

function buildFeedRow(product: MetaWearFeedProduct, imageUrl: string, variant?: MetaWearFeedVariant): MetaWearFeedRow {
  const itemGroupId = rowId(product.id);
  const variantPrice = variant?.priceCents ?? product.priceCents;

  return {
    id: rowId(product.id, variant?.id),
    title: titleForRow(product, variant),
    description: descriptionForProduct(product),
    availability: availabilityForStock(variant?.stockQuantity ?? null),
    condition: "new",
    price: formatMetaPrice(variantPrice, product.currency),
    link: buildAbsoluteUrl(`/wear/${product.slug}`),
    image_link: imageUrl,
    brand: "PotteryMania",
    google_product_category: googleProductCategoryForProduct(product),
    product_type: productTypeForProduct(product),
    item_group_id: itemGroupId,
    size: normalizeText(variant?.optionSize),
    color: normalizeText(variant?.optionColor),
  };
}

export function metaWearFeedRows(products: MetaWearFeedProduct[]): MetaWearFeedRow[] {
  const rows: MetaWearFeedRow[] = [];

  for (const product of products) {
    const imageUrl = wearImageUrlsFromJson(product.images)[0] ?? "";
    if (!imageUrl) continue;

    if (product.variants.length > 0) {
      for (const variant of product.variants) {
        rows.push(buildFeedRow(product, imageUrl, variant));
      }
      continue;
    }

    rows.push(buildFeedRow(product, imageUrl));
  }

  return rows;
}

export function metaWearFeedCsv(products: MetaWearFeedProduct[]): string {
  const rows = metaWearFeedRows(products);
  return [csvLine([...META_WEAR_FEED_HEADERS]), ...rows.map((row) => csvLine(META_WEAR_FEED_HEADERS.map((key) => row[key])))]
    .join("\n");
}
