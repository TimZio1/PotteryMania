import { unstable_cache } from "next/cache";
import { findWearPublicProductsWithVariantsRetrying } from "@/lib/wear-public-catalog-query";
import { resolveWearGlobalPricing, type WearGlobalPricingConfig } from "@/lib/wear-commission";
import { resolveWearInternalPricingConfig, type WearInternalPricingConfig } from "@/lib/wear-internal-pricing";

/** Shop filters only change querystring — same listing for all views; cache cuts repeat DB hits on chip clicks. */
const SHOP_LISTING_REVALIDATE_SECONDS = 45;

const getWearShopCatalogCached = unstable_cache(
  async () => findWearPublicProductsWithVariantsRetrying(),
  ["wear-shop-public-catalog-v1"],
  { revalidate: SHOP_LISTING_REVALIDATE_SECONDS },
);

const getWearInternalPricingCached = unstable_cache(
  async () => resolveWearInternalPricingConfig(),
  ["wear-shop-internal-pricing-v1"],
  { revalidate: SHOP_LISTING_REVALIDATE_SECONDS },
);

const getWearGlobalPricingCached = unstable_cache(
  async () => resolveWearGlobalPricing(),
  ["wear-shop-global-pricing-v1"],
  { revalidate: SHOP_LISTING_REVALIDATE_SECONDS },
);

/**
 * Cached public wear listing (with variants) for `/wear/shop` navigations.
 * Short TTL keeps catalog edits near-real-time without hammering the DB on every filter tap.
 */
export function getCachedWearPublicCatalogForShop() {
  return getWearShopCatalogCached();
}

/** Cached internal pricing rules (admin config) for shop listing transforms. */
export function getCachedWearInternalPricingConfig(): Promise<WearInternalPricingConfig> {
  return getWearInternalPricingCached();
}

/** Cached platform margin (direct checkout / retail layer on internal list). */
export function getCachedWearGlobalPricing(): Promise<WearGlobalPricingConfig> {
  return getWearGlobalPricingCached();
}
