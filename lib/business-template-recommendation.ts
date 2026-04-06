import { prisma } from "@/lib/db";
import { hasStudioFeature } from "@/lib/studio-features";

export type StudioTemplateRecommendationMetrics = {
  productCount: number;
  experienceCount: number;
  bookingCount90d: number;
  orderCount90d: number;
  hasKilnFeature: boolean;
};

const MIN_SCORE = 2;

/** Load counts used to pick a “best fit” template slug for the gallery badge. */
export async function loadStudioTemplateRecommendationMetrics(studioId: string): Promise<StudioTemplateRecommendationMetrics> {
  const ago90 = new Date();
  ago90.setDate(ago90.getDate() - 90);

  const [productCount, experienceCount, bookingCount90d, orderCount90d, hasKilnFeature] = await Promise.all([
    prisma.product.count({ where: { studioId, status: { not: "archived" } } }),
    prisma.experience.count({ where: { studioId, status: { not: "archived" } } }),
    prisma.booking.count({
      where: {
        studioId,
        createdAt: { gte: ago90 },
        bookingStatus: { notIn: ["cancelled_by_customer", "cancelled_by_vendor", "cancelled_by_admin"] },
      },
    }),
    prisma.orderItem.count({
      where: {
        vendorId: studioId,
        order: { paymentStatus: "paid", createdAt: { gte: ago90 } },
      },
    }),
    hasStudioFeature(studioId, "kiln_tracking"),
  ]);

  return { productCount, experienceCount, bookingCount90d, orderCount90d, hasKilnFeature };
}

/**
 * Returns the slug with the strongest heuristic match, or null if signals are weak.
 * Only slugs that exist in the live catalog should be returned (caller filters against DB list).
 */
export function pickRecommendedTemplateSlug(m: StudioTemplateRecommendationMetrics): string | null {
  const scores: Record<string, number> = {};

  const add = (slug: string, pts: number) => {
    scores[slug] = (scores[slug] ?? 0) + pts;
  };

  if (m.hasKilnFeature) add("production_kiln_studio", 5);

  if (m.productCount >= 6 && m.productCount >= m.experienceCount * 2) add("kits_ship_studio", 5);
  else if (m.productCount >= 4 && m.productCount > m.experienceCount) add("kits_ship_studio", 3);

  if (m.productCount >= 3 && m.experienceCount >= 2) add("shop_and_studio_hybrid", 5);
  else if (m.productCount >= 2 && m.experienceCount >= 1) add("shop_and_studio_hybrid", 2);

  if (m.experienceCount >= 2 && m.bookingCount90d >= 12) add("daily_studio_machine", 5);
  else if (m.experienceCount >= 2 && m.bookingCount90d >= 6) add("daily_studio_machine", 3);

  if (m.experienceCount >= 1 && m.experienceCount <= 4 && m.bookingCount90d < 14) add("weekend_workshop_studio", 4);

  if (m.experienceCount >= 1 && m.experienceCount <= 5 && m.bookingCount90d < 10) add("private_events_studio", 3);

  if (m.bookingCount90d >= 22 && m.experienceCount >= 2) add("members_club_studio", 4);

  if (m.experienceCount <= 2 && m.productCount <= 3 && m.bookingCount90d + m.orderCount90d < 16) add("solo_teacher_studio", 5);

  let bestSlug: string | null = null;
  let best = 0;
  for (const [slug, v] of Object.entries(scores)) {
    if (v > best) {
      best = v;
      bestSlug = slug;
    }
  }
  if (!bestSlug || best < MIN_SCORE) return null;
  return bestSlug;
}

export async function resolveStudioRecommendedTemplateSlug(studioId: string, visibleSlugs: Set<string>): Promise<string | null> {
  const m = await loadStudioTemplateRecommendationMetrics(studioId);
  const picked = pickRecommendedTemplateSlug(m);
  if (!picked || !visibleSlugs.has(picked)) return null;
  return picked;
}
