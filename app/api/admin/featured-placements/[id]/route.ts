import { NextResponse } from "next/server";
import type { FeaturedPlacementSlot } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const SLOTS: FeaturedPlacementSlot[] = ["homepage_hero", "category_top", "trending", "seasonal"];

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const before = await prisma.featuredPlacement.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    sortOrder?: number;
    startsAt?: string;
    endsAt?: string | null;
    isActive?: boolean;
    placementSlot?: string;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3) {
    return NextResponse.json({ error: "reason required (min 3 chars)" }, { status: 400 });
  }

  const data: {
    sortOrder?: number;
    startsAt?: Date;
    endsAt?: Date | null;
    isActive?: boolean;
    placementSlot?: FeaturedPlacementSlot;
  } = {};

  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) data.sortOrder = body.sortOrder;
  if (typeof body.startsAt === "string") {
    const d = new Date(body.startsAt);
    if (!Number.isNaN(d.getTime())) data.startsAt = d;
  }
  if (body.endsAt === null) data.endsAt = null;
  else if (typeof body.endsAt === "string") {
    const d = new Date(body.endsAt);
    if (!Number.isNaN(d.getTime())) data.endsAt = d;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.placementSlot && SLOTS.includes(body.placementSlot as FeaturedPlacementSlot)) {
    data.placementSlot = body.placementSlot as FeaturedPlacementSlot;
  }

  const row = await prisma.featuredPlacement.update({
    where: { id },
    data,
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "featured_placement.update",
    entityType: "featured_placement",
    entityId: id,
    before: {
      sortOrder: before.sortOrder,
      startsAt: before.startsAt.toISOString(),
      endsAt: before.endsAt?.toISOString() ?? null,
      isActive: before.isActive,
      placementSlot: before.placementSlot,
    },
    after: {
      sortOrder: row.sortOrder,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt?.toISOString() ?? null,
      isActive: row.isActive,
      placementSlot: row.placementSlot,
    },
    reason,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const before = await prisma.featuredPlacement.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let reason = "";
  try {
    const j = (await req.json()) as { reason?: string };
    reason = typeof j.reason === "string" ? j.reason.trim() : "";
  } catch {
    reason = new URL(req.url).searchParams.get("reason")?.trim() ?? "";
  }
  if (reason.length < 3) {
    return NextResponse.json({ error: "reason required (min 3 chars) in JSON body" }, { status: 400 });
  }

  await prisma.featuredPlacement.delete({ where: { id } });
  await logAdminAction({
    actorUserId: user.id,
    action: "featured_placement.delete",
    entityType: "featured_placement",
    entityId: id,
    before: { studioId: before.studioId, placementSlot: before.placementSlot },
    reason,
  });

  return NextResponse.json({ ok: true });
}
