import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { cancelStudioFeatureStripeSubscription } from "@/lib/studio-feature-billing";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId }, select: { id: true, displayName: true } });
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    featureId?: string;
    status?: string;
    overridePriceCents?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const featureId = typeof body.featureId === "string" ? body.featureId.trim() : "";
  if (!featureId) {
    return NextResponse.json({ error: "featureId required" }, { status: 400 });
  }

  const feature = await prisma.platformFeature.findUnique({ where: { id: featureId } });
  if (!feature) return NextResponse.json({ error: "Feature not found" }, { status: 404 });

  const existing = await prisma.studioFeatureActivation.findUnique({
    where: { studioId_featureId: { studioId, featureId } },
  });

  const hasStatus = typeof body.status === "string";
  const hasOverride = "overridePriceCents" in body;
  if (!hasStatus && !hasOverride) {
    return NextResponse.json({ error: "status and/or overridePriceCents required" }, { status: 400 });
  }

  const beforeSnap = existing
    ? {
        status: existing.status,
        overridePriceCents: existing.overridePriceCents,
        stripeSubscriptionId: existing.stripeSubscriptionId ? "[set]" : null,
      }
    : null;

  if (hasStatus) {
    if (body.status === "active") {
      if (existing?.stripeSubscriptionId) {
        await cancelStudioFeatureStripeSubscription(existing);
      }
      const now = new Date();
      await prisma.studioFeatureActivation.upsert({
        where: { studioId_featureId: { studioId, featureId } },
        create: {
          studioId,
          featureId,
          status: "active",
          activatedAt: now,
          stripeSubscriptionId: null,
          stripeSubscriptionItemId: null,
        },
        update: {
          status: "active",
          activatedAt: now,
          stripeSubscriptionId: null,
          stripeSubscriptionItemId: null,
          trialEndsAt: null,
          deactivatesAt: null,
        },
      });
      await prisma.studioFeatureRequest.upsert({
        where: { studioId_featureKey: { studioId, featureKey: feature.slug } },
        create: { studioId, featureKey: feature.slug, desiredOn: true },
        update: { desiredOn: true },
      });
    } else if (body.status === "inactive") {
      if (existing) {
        await cancelStudioFeatureStripeSubscription(existing);
      }
      await prisma.studioFeatureActivation.upsert({
        where: { studioId_featureId: { studioId, featureId } },
        create: {
          studioId,
          featureId,
          status: "inactive",
          activatedAt: null,
          stripeSubscriptionId: null,
        },
        update: {
          status: "inactive",
          activatedAt: null,
          stripeSubscriptionId: null,
          stripeSubscriptionItemId: null,
          trialEndsAt: null,
          deactivatesAt: null,
        },
      });
      await prisma.studioFeatureRequest.upsert({
        where: { studioId_featureKey: { studioId, featureKey: feature.slug } },
        create: { studioId, featureKey: feature.slug, desiredOn: false },
        update: { desiredOn: false },
      });
    } else {
      return NextResponse.json({ error: "status must be active or inactive" }, { status: 400 });
    }
  }

  if (hasOverride) {
    const v = body.overridePriceCents;
    let cents: number | null = null;
    if (v === null) {
      cents = null;
    } else if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      cents = Math.round(v);
    } else {
      return NextResponse.json({ error: "overridePriceCents must be null or a non-negative number" }, { status: 400 });
    }

    await prisma.studioFeatureActivation.upsert({
      where: { studioId_featureId: { studioId, featureId } },
      create: {
        studioId,
        featureId,
        status: "inactive",
        overridePriceCents: cents,
      },
      update: {
        overridePriceCents: cents,
      },
    });
  }

  const fresh = await prisma.studioFeatureActivation.findUnique({
    where: { studioId_featureId: { studioId, featureId } },
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "studio.feature_activation_admin",
    entityType: "studio",
    entityId: studioId,
    before: beforeSnap,
    after: fresh
      ? {
          featureSlug: feature.slug,
          status: fresh.status,
          overridePriceCents: fresh.overridePriceCents,
        }
      : null,
    reason: typeof body.status === "string" ? `status:${body.status}` : "overridePriceCents",
  });

  return NextResponse.json({
    ok: true,
    activation: fresh
      ? {
          id: fresh.id,
          status: fresh.status,
          overridePriceCents: fresh.overridePriceCents,
        }
      : null,
  });
}
