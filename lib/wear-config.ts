/**
 * PotteryMania /wear — Spreadshop (phase 1: same-tab redirect).
 * Set NEXT_PUBLIC_SPREADSHOP_URL on Railway to your Spreadshop storefront URL.
 */

export type WearPreviewItem = {
  id: string;
  /** When set, preview tile links into the native `/wear/[slug]` PDP. */
  slug?: string;
  name: string;
  /** Minimal price hint; empty = omit on UI */
  priceLabel?: string;
  imageSrc: string;
  imageAlt: string;
};

/** Curated preview tiles (replace images/copy when you have final assets). */
export const WEAR_PREVIEW_ITEMS: WearPreviewItem[] = [
  {
    id: "1",
    slug: "studio-mark-tee",
    name: "Studio mark · tee",
    priceLabel: "from €28",
    imageSrc:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Plain crewneck shirt on a neutral background",
  },
  {
    id: "2",
    slug: "hands-in-the-clay-longsleeve",
    name: "Hands in the clay · longsleeve",
    priceLabel: "from €34",
    imageSrc:
      "https://images.unsplash.com/photo-1610701596007-1150281fbcdd?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Hands shaping wet clay on a wheel",
  },
  {
    id: "3",
    slug: "quiet-kiln-cap",
    name: "Quiet kiln · cap",
    imageSrc:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Ceramic vessels on a studio shelf",
  },
  {
    id: "4",
    slug: "build-your-space-hoodie",
    name: "Build your space · hoodie",
    priceLabel: "from €52",
    imageSrc:
      "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Pottery studio workspace with tools",
  },
];

export const WEAR_VISUAL_IMAGES = {
  primary:
    "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1600&q=80",
  primaryAlt: "Hands working with clay in soft light",
  secondary:
    "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80",
  secondaryAlt: "Minimal fabric texture and natural light",
} as const;

export function getWearSpreadshopUrl(): string {
  return process.env.NEXT_PUBLIC_SPREADSHOP_URL?.trim() ?? "";
}
