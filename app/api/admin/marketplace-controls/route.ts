import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

/** Single payload for /admin/marketplace UI (P5-F + P4-E). */
export async function GET() {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [placements, boosts, studios] = await Promise.all([
    prisma.featuredPlacement.findMany({
      orderBy: [{ placementSlot: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        studio: { select: { id: true, displayName: true, status: true } },
      },
      take: 200,
    }),
    prisma.rankingBoost.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        studio: { select: { id: true, displayName: true, status: true } },
      },
      take: 200,
    }),
    prisma.studio.findMany({
      where: { status: "approved" },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
  ]);

  return NextResponse.json({
    placements: placements.map((p) => ({
      id: p.id,
      studioId: p.studioId,
      studioName: p.studio.displayName,
      placementSlot: p.placementSlot,
      sortOrder: p.sortOrder,
      startsAt: p.startsAt.toISOString(),
      endsAt: p.endsAt?.toISOString() ?? null,
      isActive: p.isActive,
    })),
    boosts: boosts.map((b) => ({
      id: b.id,
      studioId: b.studioId,
      studioName: b.studio.displayName,
      boostType: b.boostType,
      boostValue: b.boostValue,
      reason: b.reason,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
    })),
    studios,
  });
}
