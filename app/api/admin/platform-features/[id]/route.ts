import { NextResponse } from "next/server";
import type { PlatformFeatureVisibility } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const VIS: PlatformFeatureVisibility[] = ["public", "hidden", "beta"];

const REASON_MAX = 500;

function platformFeaturePatchIsNoOp(
  before: NonNullable<Awaited<ReturnType<typeof prisma.platformFeature.findUnique>>>,
  data: Record<string, unknown>,
): boolean {
  const keys = Object.keys(data);
  if (!keys.length) return false;
  for (const k of keys) {
    const key = k as keyof typeof before;
    if (!(key in before)) return false;
    if (before[key] !== data[k]) return false;
  }
  return true;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: {
    name?: string;
    description?: string;
    category?: string;
    priceCents?: number;
    currency?: string;
    isActive?: boolean;
    grantByDefault?: boolean;
    visibility?: string;
    sortOrder?: number;
    stripePriceId?: string | null;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reasonTrimmed =
    typeof body.reason === "string" ? body.reason.trim().slice(0, REASON_MAX) : "";
  const auditReason = reasonTrimmed.length > 0 ? reasonTrimmed : null;

  const before = await prisma.platformFeature.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    name?: string;
    description?: string;
    category?: string;
    priceCents?: number;
    currency?: string;
    isActive?: boolean;
    grantByDefault?: boolean;
    visibility?: PlatformFeatureVisibility;
    sortOrder?: number;
    stripePriceId?: string | null;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === "string") data.description = body.description;
  if (typeof body.category === "string" && body.category.trim()) data.category = body.category.trim();
  if (typeof body.priceCents === "number" && Number.isFinite(body.priceCents) && body.priceCents >= 0) {
    data.priceCents = Math.round(body.priceCents);
  }
  if (typeof body.currency === "string" && body.currency.trim().length === 3) {
    data.currency = body.currency.trim().toUpperCase();
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.grantByDefault === "boolean") data.grantByDefault = body.grantByDefault;
  if (typeof body.visibility === "string" && VIS.includes(body.visibility as PlatformFeatureVisibility)) {
    data.visibility = body.visibility as PlatformFeatureVisibility;
  }
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.round(body.sortOrder);
  }
  if (body.stripePriceId !== undefined) {
    if (body.stripePriceId === null) data.stripePriceId = null;
    else if (typeof body.stripePriceId === "string") {
      const t = body.stripePriceId.trim();
      if (!t.length) data.stripePriceId = null;
      else if (t.startsWith("price_")) data.stripePriceId = t;
      else {
        return NextResponse.json(
          { error: "stripePriceId must be empty or a Stripe Price id (price_…)" },
          { status: 400 },
        );
      }
    }
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  if (platformFeaturePatchIsNoOp(before, data as Record<string, unknown>)) {
    return NextResponse.json({
      feature: {
        id: before.id,
        slug: before.slug,
        name: before.name,
        description: before.description,
        category: before.category,
        priceCents: before.priceCents,
        currency: before.currency,
        isActive: before.isActive,
        visibility: before.visibility,
        grantByDefault: before.grantByDefault,
        sortOrder: before.sortOrder,
        stripePriceId: before.stripePriceId,
        updatedAt: before.updatedAt.toISOString(),
      },
    });
  }

  const updated = await prisma.platformFeature.update({
    where: { id },
    data,
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "platform_feature.update",
    entityType: "platform_feature",
    entityId: id,
    before: {
      slug: before.slug,
      name: before.name,
      description: before.description,
      category: before.category,
      priceCents: before.priceCents,
      currency: before.currency,
      isActive: before.isActive,
      grantByDefault: before.grantByDefault,
      visibility: before.visibility,
      sortOrder: before.sortOrder,
      stripePriceId: before.stripePriceId,
    },
    after: {
      slug: updated.slug,
      name: updated.name,
      description: updated.description,
      category: updated.category,
      priceCents: updated.priceCents,
      currency: updated.currency,
      isActive: updated.isActive,
      grantByDefault: updated.grantByDefault,
      visibility: updated.visibility,
      sortOrder: updated.sortOrder,
      stripePriceId: updated.stripePriceId,
    },
    reason: auditReason,
  });

  return NextResponse.json({
    feature: {
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      description: updated.description,
      category: updated.category,
      priceCents: updated.priceCents,
      currency: updated.currency,
      isActive: updated.isActive,
      visibility: updated.visibility,
      grantByDefault: updated.grantByDefault,
      sortOrder: updated.sortOrder,
      stripePriceId: updated.stripePriceId,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
