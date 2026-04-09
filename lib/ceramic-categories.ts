import type { CeramicCategory, PrismaClient } from "@prisma/client";

export type LockedCeramicCategory = {
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  imageUrl: string;
  icon?: string;
  value: CeramicCategory;
};

export const LOCKED_CERAMIC_CATEGORIES: LockedCeramicCategory[] = [
  {
    slug: "tableware",
    title: "Tableware",
    shortDescription: "Everyday essentials crafted by independent ceramic studios.",
    longDescription:
      "Discover handmade tableware designed for daily rituals and elevated dining. From bowls to dinner plates, PotteryMania curates functional ceramic pieces made by independent studios.",
    imageUrl:
      "https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?auto=format&fit=crop&w=1800&q=80",
    icon: "plate",
    value: "tableware",
  },
  {
    slug: "decorative-objects",
    title: "Decorative Objects",
    shortDescription: "Sculptural ceramics that shape mood and space.",
    longDescription:
      "Browse decorative ceramic objects that bring texture, warmth, and artistic character to interiors. Each piece is handmade in small batches by trusted makers.",
    imageUrl:
      "https://images.unsplash.com/photo-1612196808214-bf7ad7533198?auto=format&fit=crop&w=1800&q=80",
    icon: "sparkles",
    value: "decorative_objects",
  },
  {
    slug: "vases-plant-pots",
    title: "Vases & Plant Pots",
    shortDescription: "Ceramic vessels for flowers, branches, and indoor greens.",
    longDescription:
      "Explore handmade vases and plant pots that pair organic forms with durable craftsmanship. Ideal for modern homes, creative studios, and gifting.",
    imageUrl:
      "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1800&q=80",
    icon: "leaf",
    value: "vases_and_plant_pots",
  },
  {
    slug: "lighting",
    title: "Lighting",
    shortDescription: "Ceramic lighting accents that balance utility and atmosphere.",
    longDescription:
      "Shop ceramic lighting objects crafted to add soft character to living rooms, bedrooms, and hospitality spaces. Functional pieces with gallery-level presence.",
    imageUrl:
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1800&q=80",
    icon: "lamp",
    value: "lighting",
  },
  {
    slug: "kitchen-serving",
    title: "Kitchen & Serving",
    shortDescription: "Serving pieces designed for hosting and shared meals.",
    longDescription:
      "Find serving platters, prep vessels, and kitchen ceramics made for practical use and visual impact. Built for hosts, chefs, and everyday rituals.",
    imageUrl:
      "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=1800&q=80",
    icon: "utensils",
    value: "kitchen_and_serving",
  },
  {
    slug: "coffee-tea",
    title: "Coffee & Tea",
    shortDescription: "Mugs, cups, and brewing companions for intentional moments.",
    longDescription:
      "Discover handmade ceramic mugs, cups, and tea service pieces designed around daily coffee and tea rituals. Durable, tactile, and studio-made.",
    imageUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1800&q=80",
    icon: "cup",
    value: "coffee_and_tea",
  },
  {
    slug: "bathroom-wellness",
    title: "Bathroom & Wellness",
    shortDescription: "Ceramic forms for calm, storage, and wellness routines.",
    longDescription:
      "Browse ceramic accessories for bathroom and wellness spaces, from holders to trays and ritual vessels, crafted to combine clean function with calm design.",
    imageUrl:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1800&q=80",
    icon: "droplet",
    value: "bathroom_and_wellness",
  },
  {
    slug: "jewelry-small-objects",
    title: "Jewelry & Small Objects",
    shortDescription: "Compact ceramic pieces with detail-focused craftsmanship.",
    longDescription:
      "Shop jewelry dishes, mini vessels, and small ceramic objects handcrafted for gifting, collecting, and styling. Small scale, high character.",
    imageUrl:
      "https://images.unsplash.com/photo-1514995669114-6081e934b693?auto=format&fit=crop&w=1800&q=80",
    icon: "gem",
    value: "jewelry_and_small_objects",
  },
  {
    slug: "outdoor-garden",
    title: "Outdoor & Garden",
    shortDescription: "Weather-ready ceramics for terraces and garden corners.",
    longDescription:
      "Explore outdoor and garden ceramics built for seasonal use and enduring aesthetics. Planters and durable objects designed for open-air living.",
    imageUrl:
      "https://images.unsplash.com/photo-1463320726281-696a485928c7?auto=format&fit=crop&w=1800&q=80",
    icon: "sprout",
    value: "outdoor_and_garden",
  },
  {
    slug: "ritual-artistic-pieces",
    title: "Ritual & Artistic Pieces",
    shortDescription: "Expressive ceramics for collecting, ritual, and contemplation.",
    longDescription:
      "Discover artistic ceramic pieces that sit between utility and sculpture. Curated works for collectors, stylists, and ritual-centered interiors.",
    imageUrl:
      "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1800&q=80",
    icon: "flame",
    value: "ritual_and_artistic_pieces",
  },
];

const bySlug = new Map(LOCKED_CERAMIC_CATEGORIES.map((c) => [c.slug, c] as const));
const byValue = new Map(LOCKED_CERAMIC_CATEGORIES.map((c) => [c.value, c] as const));

export function allCeramicCategories(): LockedCeramicCategory[] {
  return LOCKED_CERAMIC_CATEGORIES;
}

export function ceramicCategoryFromSlug(slug: string | null | undefined): CeramicCategory | null {
  if (!slug) return null;
  return bySlug.get(slug)?.value ?? null;
}

export function ceramicCategoryMetaBySlug(slug: string | null | undefined): LockedCeramicCategory | null {
  if (!slug) return null;
  return bySlug.get(slug) ?? null;
}

export function ceramicCategoryMetaByValue(value: CeramicCategory): LockedCeramicCategory {
  return byValue.get(value) ?? LOCKED_CERAMIC_CATEGORIES[0];
}

export async function syncLockedCeramicCategories(prisma: PrismaClient): Promise<void> {
  for (const category of LOCKED_CERAMIC_CATEGORIES) {
    await prisma.productCategory.upsert({
      where: { slug: category.slug },
      create: {
        name: category.title,
        slug: category.slug,
        shortDescription: category.shortDescription,
        longDescription: category.longDescription,
        imageUrl: category.imageUrl,
        icon: category.icon ?? null,
        isActive: true,
      },
      update: {
        name: category.title,
        shortDescription: category.shortDescription,
        longDescription: category.longDescription,
        imageUrl: category.imageUrl,
        icon: category.icon ?? null,
      },
    });
  }
}
