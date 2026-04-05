import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { featureBundleToDto } from "@/lib/admin-feature-bundle-dto";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: {
    name?: string;
    description?: string;
    priceCents?: number;
    currency?: string;
    isActive?: boolean;
    sortOrder?: number;
    validFrom?: string | null;
    validUntil?: string | null;
    stripePriceId?: string | null;
    featureIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const before = await prisma.featureBundle.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { feature: true },
      },
    },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    name?: string;
    description?: string;
    priceCents?: number;
    currency?: string;
    isActive?: boolean;
    sortOrder?: number;
    validFrom?: Date | null;
    validUntil?: Date | null;
    stripePriceId?: string | null;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === "string") data.description = body.description;
  if (typeof body.priceCents === "number" && Number.isFinite(body.priceCents) && body.priceCents >= 0) {
    data.priceCents = Math.round(body.priceCents);
  }
  if (typeof body.currency === "string" && body.currency.trim().length === 3) {
    data.currency = body.currency.trim().toUpperCase();
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.round(body.sortOrder);
  }

  if (body.validFrom !== undefined) {
    if (body.validFrom === null || body.validFrom === "") data.validFrom = null;
    else {
      const d = new Date(body.validFrom);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "validFrom must be ISO date or empty" }, { status: 400 });
      }
      data.validFrom = d;
    }
  }
  if (body.validUntil !== undefined) {
    if (body.validUntil === null || body.validUntil === "") data.validUntil = null;
    else {
      const d = new Date(body.validUntil);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "validUntil must be ISO date or empty" }, { status: 400 });
      }
      data.validUntil = d;
    }
  }

  if (body.stripePriceId !== undefined) {
    if (body.stripePriceId === null) data.stripePriceId = null;
    else if (typeof body.stripePriceId === "string") {
      const t = body.stripePriceId.trim();
      data.stripePriceId = t.length ? t : null;
    }
  }

  const replaceItems = body.featureIds !== undefined;
  let featureIds: string[] = [];
  if (replaceItems) {
    featureIds = Array.isArray(body.featureIds) ? body.featureIds.filter((x) => typeof x === "string") : [];
    const uniqueIds = [...new Set(featureIds)];
    if (uniqueIds.length === 0) {
      return NextResponse.json({ error: "featureIds must include at least one catalog feature" }, { status: 400 });
    }
    const features = await prisma.platformFeature.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    if (features.length !== uniqueIds.length) {
      return NextResponse.json({ error: "One or more feature ids are invalid" }, { status: 400 });
    }
  }

  if (!Object.keys(data).length && !replaceItems) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (replaceItems) {
      await tx.featureBundleItem.deleteMany({ where: { bundleId: id } });
      await tx.featureBundleItem.createMany({
        data: featureIds.map((featureId, idx) => ({
          bundleId: id,
          featureId,
          sortOrder: idx,
        })),
      });
    }
    if (Object.keys(data).length) {
      return tx.featureBundle.update({
        where: { id },
        data,
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: { feature: true },
          },
        },
      });
    }
    return tx.featureBundle.findUniqueOrThrow({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: { feature: true },
        },
      },
    });
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "feature_bundle.update",
    entityType: "feature_bundle",
    entityId: id,
    before: {
      slug: before.slug,
      name: before.name,
      priceCents: before.priceCents,
      isActive: before.isActive,
      itemCount: before.items.length,
    },
    after: {
      slug: updated.slug,
      name: updated.name,
      priceCents: updated.priceCents,
      isActive: updated.isActive,
      itemCount: updated.items.length,
    },
    reason: null,
  });

  return NextResponse.json({ bundle: featureBundleToDto(updated) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.featureBundle.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.featureBundle.delete({ where: { id } });

  await logAdminAction({
    actorUserId: user.id,
    action: "feature_bundle.delete",
    entityType: "feature_bundle",
    entityId: id,
    before: { slug: existing.slug, name: existing.name },
    reason: null,
  });

  return NextResponse.json({ ok: true });
}
