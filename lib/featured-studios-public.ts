import type { FeaturedPlacementSlot } from "@prisma/client";
import { prisma } from "@/lib/db";

export type FeaturedStudioCard = {
  placementId: string;
  studioId: string;
  displayName: string;
  city: string | null;
  country: string | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  shortDescription: string | null;
};

/**
 * Active curated placements for a slot (P4-C): time-bounded, active flag, approved studios only.
 */
export async function getFeaturedStudiosForSlot(
  slot: FeaturedPlacementSlot,
  now: Date = new Date(),
): Promise<FeaturedStudioCard[]> {
  const rows = await prisma.featuredPlacement.findMany({
    where: {
      placementSlot: slot,
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      studio: { status: "approved" },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      studio: {
        select: {
          id: true,
          displayName: true,
          city: true,
          country: true,
          coverImageUrl: true,
          logoUrl: true,
          shortDescription: true,
          status: true,
        },
      },
    },
  });

  return rows
    .filter((r) => r.studio.status === "approved")
    .map((r) => ({
      placementId: r.id,
      studioId: r.studio.id,
      displayName: r.studio.displayName,
      city: r.studio.city,
      country: r.studio.country,
      coverImageUrl: r.studio.coverImageUrl,
      logoUrl: r.studio.logoUrl,
      shortDescription: r.studio.shortDescription,
    }));
}
