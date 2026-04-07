import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { listStudioFeaturesForVendor } from "@/lib/studio-features";
import { listStudioBundlesForVendor } from "@/lib/studio-feature-bundles-vendor";
import { applyStudioFeatureBundle } from "@/lib/studio-feature-bundle-apply";
import {
  createStudioFeatureSubscriptionCheckout,
  platformFeatureRequiresStripeSubscription,
  removeStudioFeatureFromStripeBilling,
  resumeStudioFeatureStripeSubscription,
  scheduleStudioFeatureSubscriptionCancelAtPeriodEnd,
  setStudioFeatureRequestsDesiredForSubscription,
  tryAddStudioFeatureViaSubscriptionItem,
} from "@/lib/studio-feature-billing";
import { recordStudioFeatureActivationEvent } from "@/lib/studio-feature-activation-events";
import { logApiError } from "@/lib/monitoring";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [features, bundles] = await Promise.all([
    listStudioFeaturesForVendor(studioId),
    listStudioBundlesForVendor(studioId),
  ]);
  const desiredByKey = Object.fromEntries(features.map((f) => [f.slug, f.preferenceOn]));
  return NextResponse.json({ features, bundles, desiredByKey });
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

  let body: {
    featureKey?: string;
    desiredOn?: boolean;
    slug?: string;
    active?: boolean;
    bundleId?: string;
    /** When turning off a paid add-on: if true, Stripe cancel_at_period_end (access until billing period ends). */
    cancelAtPeriodEnd?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bundleId = typeof body.bundleId === "string" ? body.bundleId.trim() : "";
  if (bundleId.length) {
    const result = await applyStudioFeatureBundle({
      studioId,
      studio,
      ownerEmail: user.email ?? "",
      bundleId,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    if ("checkoutUrl" in result) {
      return NextResponse.json({
        checkoutUrl: result.checkoutUrl,
        bundleSlug: result.bundleSlug,
        pending: true,
        message: "Complete payment in Stripe to activate all add-ons in this bundle.",
      });
    }
    if ("alreadyComplete" in result && result.alreadyComplete) {
      return NextResponse.json({
        ok: true,
        bundleId,
        alreadyComplete: true,
        message: "Every add-on in this bundle is already active for your studio.",
      });
    }
    if ("activatedSlugs" in result) {
      return NextResponse.json({
        ok: true,
        bundleId,
        activatedSlugs: result.activatedSlugs,
        needsIndividualStripeSlugs: result.needsIndividualStripeSlugs,
        message:
          result.needsIndividualStripeSlugs.length > 0
            ? "Free add-ons in the bundle are on. Subscribe to the remaining add-ons individually below."
            : "Bundle add-ons updated.",
      });
    }
    return NextResponse.json({ error: "Unexpected bundle response" }, { status: 500 });
  }

  const slug =
    (typeof body.slug === "string" ? body.slug.trim() : "") ||
    (typeof body.featureKey === "string" ? body.featureKey.trim() : "");
  if (!slug.length) {
    return NextResponse.json({ error: "slug, featureKey, or bundleId required" }, { status: 400 });
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

  if (desiredOn && existing?.status === "pending_cancel" && existing.stripeSubscriptionId?.trim()) {
    const subId = existing.stripeSubscriptionId.trim();
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured — cannot resume subscription." },
        { status: 503 },
      );
    }
    const resumed = await resumeStudioFeatureStripeSubscription(subId);
    if (!resumed.ok) {
      return NextResponse.json({ error: "Could not resume subscription in Stripe." }, { status: 502 });
    }
    await setStudioFeatureRequestsDesiredForSubscription({
      studioId,
      subscriptionId: subId,
      desiredOn: true,
    });
    const acts = await prisma.studioFeatureActivation.findMany({
      where: { studioId, stripeSubscriptionId: subId },
      select: { featureId: true },
    });
    for (const a of acts) {
      await recordStudioFeatureActivationEvent(prisma, {
        studioId,
        featureId: a.featureId,
        kind: "vendor_enable",
        stripeSubscriptionId: subId,
      });
    }
    return NextResponse.json({ ok: true, slug, featureKey: slug, desiredOn: true, active: true, resumed: true });
  }

  if (!desiredOn) {
    const cancelAtPeriodEnd = body.cancelAtPeriodEnd === true;
    if (existing?.stripeSubscriptionId?.trim()) {
      const subId = existing.stripeSubscriptionId.trim();
      if (cancelAtPeriodEnd) {
        if (!process.env.STRIPE_SECRET_KEY) {
          return NextResponse.json(
            { error: "Stripe is not configured — cannot schedule cancel." },
            { status: 503 },
          );
        }
        const scheduled = await scheduleStudioFeatureSubscriptionCancelAtPeriodEnd(subId);
        if (!scheduled.ok) {
          if (scheduled.error === "multi_item_sub_cancel_at_period_end_unsupported") {
            return NextResponse.json(
              {
                error:
                  "This add-on shares one Stripe subscription with other add-ons. “Cancel at period end” only applies when an add-on has its own subscription. Turn it off now to remove just this add-on (prorated), or disable all add-ons on that subscription from Features.",
                code: "MULTI_ITEM_CANCEL_AT_PERIOD_END",
              },
              { status: 409 },
            );
          }
          return NextResponse.json(
            { error: "Could not schedule cancel at period end. Try again or cancel immediately." },
            { status: 502 },
          );
        }
        await setStudioFeatureRequestsDesiredForSubscription({
          studioId,
          subscriptionId: subId,
          desiredOn: false,
        });
        return NextResponse.json({
          ok: true,
          slug,
          featureKey: slug,
          desiredOn: false,
          active: false,
          cancelAtPeriodEnd: true,
          accessEndsAt: scheduled.periodEnd.toISOString(),
        });
      }
      await removeStudioFeatureFromStripeBilling({
        studioId,
        featureId: feature.id,
        stripeSubscriptionId: subId,
        stripeSubscriptionItemId: existing?.stripeSubscriptionItemId,
        featureStripePriceId: feature.stripePriceId,
      });
    }
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
    await recordStudioFeatureActivationEvent(prisma, {
      studioId,
      featureId: feature.id,
      kind: "vendor_disable",
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
    await recordStudioFeatureActivationEvent(prisma, {
      studioId,
      featureId: feature.id,
      kind: "vendor_enable",
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

  const viaItem = await tryAddStudioFeatureViaSubscriptionItem({ studioId, feature });
  if (viaItem.ok) {
    const now = new Date();
    await prisma.studioFeatureActivation.upsert({
      where: { studioId_featureId: { studioId, featureId: feature.id } },
      create: {
        studioId,
        featureId: feature.id,
        status: "active",
        activatedAt: now,
        stripeSubscriptionId: viaItem.subscriptionId,
        stripeSubscriptionItemId: viaItem.itemId,
      },
      update: {
        status: "active",
        activatedAt: now,
        stripeSubscriptionId: viaItem.subscriptionId,
        stripeSubscriptionItemId: viaItem.itemId,
        deactivatesAt: null,
      },
    });
    await prisma.studioFeatureRequest.upsert({
      where: { studioId_featureKey: { studioId, featureKey: slug } },
      create: { studioId, featureKey: slug, desiredOn: true },
      update: { desiredOn: true },
    });
    await recordStudioFeatureActivationEvent(prisma, {
      studioId,
      featureId: feature.id,
      kind: "vendor_enable",
      stripeSubscriptionId: viaItem.subscriptionId,
      payload: { subscriptionItemId: viaItem.itemId, proratedAdd: true },
    });
    return NextResponse.json({
      ok: true,
      slug,
      featureKey: slug,
      desiredOn: true,
      active: true,
      addedViaSubscriptionItem: true,
      message: "Add-on added to your existing subscription (prorated).",
    });
  }

  try {
    const session = await createStudioFeatureSubscriptionCheckout({
      studio,
      ownerEmail: user.email ?? "",
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
    logApiError("feature_requests_checkout", e, { studioId, slug }, req);
    return NextResponse.json({ error: "Could not start billing checkout" }, { status: 503 });
  }
}
