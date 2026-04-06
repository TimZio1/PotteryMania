import { NextResponse } from "next/server";
import type { FeaturedPlacementSlot } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const SLOTS: FeaturedPlacementSlot[] = ["homepage_hero", "category_top", "trending", "seasonal"];

export async function POST(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    studioId?: string;
    placementSlot?: string;
    sortOrder?: number;
    startsAt?: string;
    endsAt?: string | null;
    isActive?: boolean;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const studioId = typeof body.studioId === "string" ? body.studioId : "";
  const placementSlot = (SLOTS.includes(body.placementSlot as FeaturedPlacementSlot)
    ? body.placementSlot
    : null) as FeaturedPlacementSlot | null;
  if (!studioId || !placementSlot) {
    return NextResponse.json({ error: "studioId and valid placementSlot required" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3) {
    return NextResponse.json({ error: "reason required (min 3 chars)" }, { status: 400 });
  }

  const studio = await prisma.studio.findFirst({ where: { id: studioId, status: "approved" } });
  if (!studio) return NextResponse.json({ error: "Studio not found or not approved" }, { status: 404 });

  const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
  }
  const endsAt =
    body.endsAt === null || body.endsAt === undefined || body.endsAt === ""
      ? null
      : new Date(body.endsAt);
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "Invalid endsAt" }, { status: 400 });
  }

  const sortOrder = typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder) ? body.sortOrder : 0;
  const isActive = body.isActive !== false;

  const row = await prisma.featuredPlacement.create({
    data: {
      studioId,
      placementSlot,
      sortOrder,
      startsAt,
      endsAt,
      isActive,
    },
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "featured_placement.create",
    entityType: "featured_placement",
    entityId: row.id,
    after: {
      studioId,
      placementSlot,
      sortOrder,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt?.toISOString() ?? null,
      isActive,
    },
    reason,
  });

  return NextResponse.json({ id: row.id });
}
