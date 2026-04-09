import { NextResponse } from "next/server";
import type { Prisma, StudioStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { logApiError } from "@/lib/monitoring";

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
    /** Audit trail — required for status or rank weight changes. */
    reason?: string;
  };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_studio_patch_invalid_json", e, { studioId }, req);
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

  const auditReason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if ((hasStatus || hasWeight) && auditReason.length < 8) {
    return NextResponse.json(
      { error: "reason required (at least 8 characters) for studio updates" },
      { status: 400 },
    );
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
    } else if (status === "pending_review") {
      data.rejectionReason = null;
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
      reason: `${auditReason} · status:${status}${
        typeof body.rejectionReason === "string" && body.rejectionReason.trim()
          ? ` · ${body.rejectionReason.trim().slice(0, 200)}`
          : ""
      }`,
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
      reason: auditReason,
    });
  }

  return NextResponse.json({ studio });
}
