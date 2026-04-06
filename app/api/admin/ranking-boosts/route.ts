import { NextResponse } from "next/server";
import type { RankingBoostType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const TYPES: RankingBoostType[] = ["featured", "seasonal", "manual", "paid"];

export async function POST(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    studioId?: string;
    boostType?: string;
    boostValue?: number;
    reason?: string;
    startsAt?: string;
    endsAt?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const studioId = typeof body.studioId === "string" ? body.studioId : "";
  const boostType = (TYPES.includes(body.boostType as RankingBoostType) ? body.boostType : null) as RankingBoostType | null;
  const boostValue = typeof body.boostValue === "number" && Number.isFinite(body.boostValue) ? body.boostValue : NaN;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!studioId || !boostType || Number.isNaN(boostValue) || reason.length < 3) {
    return NextResponse.json(
      { error: "studioId, boostType, boostValue, and reason (min 3 chars) required" },
      { status: 400 },
    );
  }

  const studio = await prisma.studio.findFirst({ where: { id: studioId, status: "approved" } });
  if (!studio) return NextResponse.json({ error: "Studio not found or not approved" }, { status: 404 });

  const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
  if (Number.isNaN(startsAt.getTime())) return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
  const endsAt =
    body.endsAt === null || body.endsAt === undefined || body.endsAt === ""
      ? null
      : new Date(body.endsAt);
  if (endsAt && Number.isNaN(endsAt.getTime())) return NextResponse.json({ error: "Invalid endsAt" }, { status: 400 });

  const row = await prisma.rankingBoost.create({
    data: {
      studioId,
      boostType,
      boostValue,
      reason,
      startsAt,
      endsAt,
      createdByUserId: user.id,
    },
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "ranking_boost.create",
    entityType: "ranking_boost",
    entityId: row.id,
    after: {
      studioId,
      boostType,
      boostValue,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt?.toISOString() ?? null,
    },
    reason,
  });

  return NextResponse.json({ id: row.id });
}
