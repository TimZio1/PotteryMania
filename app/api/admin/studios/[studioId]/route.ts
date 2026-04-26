import { NextResponse } from "next/server";
import { Prisma, type StudioStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { logApiError } from "@/lib/monitoring";

type Ctx = { params: Promise<{ studioId: string }> };

/**
 * Free-text fields the admin panel is allowed to edit on a studio.
 * Each entry is `[bodyKey, prismaKey, maxLen]`. Treat empty strings as null
 * for nullable columns; required columns reject empty strings.
 */
const STUDIO_EDITABLE_FIELDS: Array<{
  key:
    | "displayName"
    | "legalBusinessName"
    | "vatNumber"
    | "responsiblePersonName"
    | "email"
    | "phone"
    | "country"
    | "city"
    | "addressLine1"
    | "addressLine2"
    | "postalCode"
    | "shortDescription"
    | "websiteUrl"
    | "instagramUrl"
    | "facebookUrl";
  required: boolean;
  maxLen: number;
}> = [
  { key: "displayName", required: true, maxLen: 120 },
  { key: "legalBusinessName", required: true, maxLen: 200 },
  { key: "vatNumber", required: true, maxLen: 60 },
  { key: "responsiblePersonName", required: true, maxLen: 120 },
  { key: "email", required: true, maxLen: 200 },
  { key: "phone", required: false, maxLen: 40 },
  { key: "country", required: true, maxLen: 60 },
  { key: "city", required: true, maxLen: 80 },
  { key: "addressLine1", required: true, maxLen: 200 },
  { key: "addressLine2", required: false, maxLen: 200 },
  { key: "postalCode", required: false, maxLen: 30 },
  { key: "shortDescription", required: false, maxLen: 280 },
  { key: "websiteUrl", required: false, maxLen: 300 },
  { key: "instagramUrl", required: false, maxLen: 300 },
  { key: "facebookUrl", required: false, maxLen: 300 },
];

type EditableKey = (typeof STUDIO_EDITABLE_FIELDS)[number]["key"];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

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
    /** Free-text profile fields. */
    details?: Record<string, unknown>;
    /** Audit trail — required for status / rank / details changes. */
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
  const hasDetails = isPlainObject(body.details);

  if (!hasStatus && !hasWeight && !hasDetails) {
    return NextResponse.json(
      { error: "status, marketplaceRankWeight, or details required" },
      { status: 400 },
    );
  }

  const auditReason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (auditReason.length < 8) {
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
      legalBusinessName: true,
      vatNumber: true,
      responsiblePersonName: true,
      email: true,
      phone: true,
      country: true,
      city: true,
      addressLine1: true,
      addressLine2: true,
      postalCode: true,
      shortDescription: true,
      websiteUrl: true,
      instagramUrl: true,
      facebookUrl: true,
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

  const detailDiff: Record<string, { before: string | null; after: string | null }> = {};
  if (hasDetails) {
    const details = body.details!;
    for (const spec of STUDIO_EDITABLE_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(details, spec.key)) continue;
      const raw = details[spec.key];
      if (raw === null || raw === undefined) {
        if (spec.required) {
          return NextResponse.json(
            { error: `${spec.key} cannot be empty` },
            { status: 400 },
          );
        }
        const prev = (before as Record<string, unknown>)[spec.key] as string | null | undefined;
        if (prev !== null && prev !== undefined) {
          (data as Record<string, unknown>)[spec.key] = null;
          detailDiff[spec.key] = { before: prev ?? null, after: null };
        }
        continue;
      }
      if (typeof raw !== "string") {
        return NextResponse.json(
          { error: `${spec.key} must be a string` },
          { status: 400 },
        );
      }
      const trimmed = raw.trim().slice(0, spec.maxLen);
      if (spec.required && trimmed.length === 0) {
        return NextResponse.json(
          { error: `${spec.key} cannot be empty` },
          { status: 400 },
        );
      }
      const next = trimmed.length === 0 ? null : trimmed;
      const prev = (before as Record<string, unknown>)[spec.key] as string | null | undefined;
      if ((prev ?? null) !== next) {
        (data as Record<string, unknown>)[spec.key] = next;
        detailDiff[spec.key] = { before: prev ?? null, after: next };
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  let studio: Awaited<ReturnType<typeof prisma.studio.update>>;
  try {
    studio = await prisma.studio.update({
      where: { id: studioId },
      data,
    });
  } catch (e) {
    logApiError("admin_studio_patch_update_failed", e, { studioId }, req);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "That value is already in use by another studio." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

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

  if (Object.keys(detailDiff).length > 0) {
    await logAdminAction({
      actorUserId: user.id,
      action: "studio.profile_update",
      entityType: "studio",
      entityId: studioId,
      before: Object.fromEntries(
        Object.entries(detailDiff).map(([k, v]) => [k, v.before]),
      ),
      after: Object.fromEntries(
        Object.entries(detailDiff).map(([k, v]) => [k, v.after]),
      ),
      reason: auditReason,
    });
  }

  return NextResponse.json({ studio });
}

/**
 * Admin studio DELETE (hyper_admin only).
 *
 * Studios are referenced by orders, bookings, products, payouts, etc., so a
 * literal `prisma.studio.delete` would either cascade catastrophically or
 * fail outright. Instead, we anonymize + suspend the studio (mirroring the
 * user-delete pattern) so financial records remain intact and the studio
 * disappears from public surfaces. If the studio has zero downstream
 * commerce records, we hard-delete instead (cleaner for test/junk rows).
 */
export async function DELETE(req: Request, ctx: Ctx) {
  const admin = await requireAdminUser();
  if (!admin || admin.role !== "hyper_admin") {
    return NextResponse.json(
      { error: "Only hyper_admin can delete studios" },
      { status: 403 },
    );
  }

  const { studioId } = await ctx.params;

  let body: { reason?: string };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_studio_delete_invalid_json", e, { studioId }, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 8) {
    return NextResponse.json(
      { error: "reason required (at least 8 characters)" },
      { status: 400 },
    );
  }

  const target = await prisma.studio.findUnique({
    where: { id: studioId },
    select: {
      id: true,
      displayName: true,
      email: true,
      status: true,
      _count: {
        select: {
          products: true,
          experiences: true,
          bookings: true,
        },
      },
    },
  });
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If this studio has any commerce footprint, paid orders are likely to
  // reference it via vendorId. Refuse to hard-delete and anonymize instead.
  const orderItemCount = await prisma.orderItem.count({ where: { vendorId: studioId } });
  const hasCommerce =
    orderItemCount > 0 ||
    target._count.products > 0 ||
    target._count.experiences > 0 ||
    target._count.bookings > 0;

  if (!hasCommerce) {
    try {
      await prisma.studio.delete({ where: { id: studioId } });
    } catch (e) {
      logApiError("admin_studio_hard_delete_failed", e, { studioId }, req);
      return NextResponse.json(
        { error: "Hard delete failed (studio has linked records)." },
        { status: 409 },
      );
    }

    await logAdminAction({
      actorUserId: admin.id,
      action: "studio.delete",
      entityType: "studio",
      entityId: studioId,
      before: {
        displayName: target.displayName,
        email: target.email,
        status: target.status,
        mode: "hard_delete",
      },
      after: { deleted: true },
      reason,
    });

    return NextResponse.json({
      ok: true,
      mode: "hard_delete",
      message: `Studio ${target.displayName} was hard-deleted (no commerce records).`,
    });
  }

  const anonName = `Deleted Studio ${studioId.slice(0, 8)}`;
  const anonEmail = `deleted+${studioId}@deleted.potterymania.local`;

  await prisma.studio.update({
    where: { id: studioId },
    data: {
      status: "suspended",
      displayName: anonName,
      legalBusinessName: anonName,
      vatNumber: "DELETED",
      responsiblePersonName: "Deleted",
      email: anonEmail,
      phone: null,
      shortDescription: null,
      longDescription: null,
      logoUrl: null,
      coverImageUrl: null,
      instagramUrl: null,
      facebookUrl: null,
      websiteUrl: null,
      whatsappNumber: null,
      smsEnabled: false,
      whatsappNotificationsEnabled: false,
      tipsEnabled: false,
      twilioAccountSid: null,
      twilioAuthToken: null,
      twilioPhoneNumber: null,
      rejectionReason: `admin_deleted: ${reason.slice(0, 240)}`,
      approvedAt: null,
      marketplaceRankWeight: -10_000,
    },
  });

  await logAdminAction({
    actorUserId: admin.id,
    action: "studio.delete",
    entityType: "studio",
    entityId: studioId,
    before: {
      displayName: target.displayName,
      email: target.email,
      status: target.status,
      mode: "soft_anonymize",
    },
    after: {
      displayName: anonName,
      email: anonEmail,
      status: "suspended",
    },
    reason,
  });

  return NextResponse.json({
    ok: true,
    mode: "soft_anonymize",
    message: `Studio ${target.displayName} was anonymized and suspended (commerce records preserved).`,
  });
}
