import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { listStudioFeaturesForVendor } from "@/lib/studio-features";
import {
  cancelStudioFeatureStripeSubscription,
  createStudioFeatureSubscriptionCheckout,
  platformFeatureRequiresStripeSubscription,
} from "@/lib/studio-feature-billing";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const features = await listStudioFeaturesForVendor(studioId);
  const desiredByKey = Object.fromEntries(features.map((f) => [f.slug, f.preferenceOn]));
  return NextResponse.json({ features, desiredByKey });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: {
      id: true,
      ownerUserId: true,
      displayName: true,
      stripePlatformCustomerId: true,
    },
  });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { featureKey?: string; desiredOn?: boolean; slug?: string; active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const slug =
    (typeof body.slug === "string" ? body.slug.trim() : "") ||
    (typeof body.featureKey === "string" ? body.featureKey.trim() : "");
  if (!slug.length) {
    return NextResponse.json({ error: "slug or featureKey required" }, { status: 400 });
  }
  const desiredOn = typeof body.active === "boolean" ? body.active : Boolean(body.desiredOn);

  const feature = await prisma.platformFeature.findFirst({
    where: { slug, visibility: { in: ["public", "beta"] } },
  });
  if (!feature) {
    return NextResponse.json({ error: "Unknown feature" }, { status: 400 });
  }

  const existing = await prisma.studioFeatureActivation.findUnique({
    where: { studioId_featureId: { studioId, featureId: feature.id } },
  });

  if (!desiredOn) {
    await cancelStudioFeatureStripeSubscription(existing ?? { stripeSubscriptionId: null });
    await prisma.studioFeatureActivation.upsert({
      where: { studioId_featureId: { studioId, featureId: feature.id } },
      create: {
        studioId,
        featureId: feature.id,
        status: "inactive",
        activatedAt: null,
        stripeSubscriptionId: null,
      },
      update: {
        status: "inactive",
        activatedAt: null,
        stripeSubscriptionId: null,
        deactivatesAt: null,
        trialEndsAt: null,
      },
    });
    await prisma.studioFeatureRequest.upsert({
      where: { studioId_featureKey: { studioId, featureKey: slug } },
      create: { studioId, featureKey: slug, desiredOn: false },
      update: { desiredOn: false },
    });
    return NextResponse.json({ ok: true, slug, featureKey: slug, desiredOn: false, active: false });
  }

  const needsStripeCheckout = platformFeatureRequiresStripeSubscription(feature);

  if (!needsStripeCheckout) {
    const now = new Date();
    await prisma.studioFeatureActivation.upsert({
      where: { studioId_featureId: { studioId, featureId: feature.id } },
      create: {
        studioId,
        featureId: feature.id,
        status: "active",
        activatedAt: now,
      },
      update: {
        status: "active",
        activatedAt: now,
      },
    });
    await prisma.studioFeatureRequest.upsert({
      where: { studioId_featureKey: { studioId, featureKey: slug } },
      create: { studioId, featureKey: slug, desiredOn: true },
      update: { desiredOn: true },
    });
    return NextResponse.json({ ok: true, slug, featureKey: slug, desiredOn: true, active: true });
  }

  if (existing?.status === "active" && existing.stripeSubscriptionId) {
    await prisma.studioFeatureRequest.upsert({
      where: { studioId_featureKey: { studioId, featureKey: slug } },
      create: { studioId, featureKey: slug, desiredOn: true },
      update: { desiredOn: true },
    });
    return NextResponse.json({ ok: true, slug, featureKey: slug, desiredOn: true, active: true });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe is not configured — paid add-ons cannot be started yet." },
      { status: 503 },
    );
  }

  try {
    const session = await createStudioFeatureSubscriptionCheckout({
      studio,
      ownerEmail: user.email,
      feature,
    });
    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
    }
    return NextResponse.json({
      checkoutUrl: session.url,
      slug,
      pending: true,
      message: "Complete payment in Stripe to activate this add-on.",
    });
  } catch (e) {
    console.error("[feature-requests] checkout", e);
    return NextResponse.json({ error: "Could not start billing checkout" }, { status: 503 });
  }
}
