import { NextResponse } from "next/server";
import type { Prisma, StudioStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

type Ctx = { params: Promise<{ studioId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { studioId } = await ctx.params;

  let body: {
    status?: string;
    rejectionReason?: string | null;
    marketplaceRankWeight?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hasWeight =
    typeof body.marketplaceRankWeight === "number" && Number.isFinite(body.marketplaceRankWeight);
  const status = body.status;
  const hasStatus =
    status === "approved" ||
    status === "rejected" ||
    status === "suspended" ||
    status === "pending_review";

  if (!hasStatus && !hasWeight) {
    return NextResponse.json({ error: "status or marketplaceRankWeight required" }, { status: 400 });
  }

  const before = await prisma.studio.findUnique({
    where: { id: studioId },
    select: {
      status: true,
      rejectionReason: true,
      displayName: true,
      marketplaceRankWeight: true,
    },
  });
  if (!before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Prisma.StudioUpdateInput = {};

  if (hasStatus) {
    data.status = status as StudioStatus;
    if (status === "approved") {
      data.approvedAt = new Date();
      data.rejectionReason = null;
    } else if (status === "rejected") {
      data.rejectionReason = body.rejectionReason ?? "Rejected";
      data.approvedAt = null;
    } else {
      data.approvedAt = null;
    }
  }

  if (hasWeight) {
    data.marketplaceRankWeight = Math.round(
      Math.min(10_000, Math.max(-10_000, body.marketplaceRankWeight!)),
    );
  }

  const studio = await prisma.studio.update({
    where: { id: studioId },
    data,
  });

  if (hasStatus) {
    await logAdminAction({
      actorUserId: user.id,
      action: "studio.status_update",
      entityType: "studio",
      entityId: studioId,
      before: {
        status: before.status,
        rejectionReason: before.rejectionReason,
        displayName: before.displayName,
      },
      after: {
        status: studio.status,
        rejectionReason: studio.rejectionReason,
        displayName: studio.displayName,
      },
      reason: typeof body.rejectionReason === "string" ? body.rejectionReason : status,
    });
  }

  if (hasWeight) {
    await logAdminAction({
      actorUserId: user.id,
      action: "studio.marketplace_rank",
      entityType: "studio",
      entityId: studioId,
      before: { marketplaceRankWeight: before.marketplaceRankWeight },
      after: { marketplaceRankWeight: studio.marketplaceRankWeight },
      reason: null,
    });
  }

  return NextResponse.json({ studio });
}
