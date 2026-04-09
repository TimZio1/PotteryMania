import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import {
  removeStudioFeatureFromStripeBilling,
  scheduleStudioFeatureSubscriptionCancelAtPeriodEnd,
  setStudioFeatureRequestsDesiredForSubscription,
} from "@/lib/studio-feature-billing";
import { recordStudioFeatureActivationEvent } from "@/lib/studio-feature-activation-events";
import { logApiError } from "@/lib/monitoring";

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
    /** When revoking with a Stripe subscription: schedule cancel_at_period_end instead of immediate cancel. */
    cancelStripeAtPeriodEnd?: boolean;
    /** Required for status changes (audit). */
    reason?: string;
  };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_studio_feature_activations_patch_invalid_json", e, { studioId }, req);
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

  const auditReason =
    typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if ((hasStatus || hasOverride) && auditReason.length < 8) {
    return NextResponse.json(
      { error: "reason required (at least 8 characters) for add-on entitlement changes" },
      { status: 400 },
    );
  }

  const beforeSnap = existing
    ? {
        status: existing.status,
        overridePriceCents: existing.overridePriceCents,
        stripeSubscriptionId: existing.stripeSubscriptionId ? "[set]" : null,
      }
    : null;

  /** When admin schedules Stripe cancel at period end, ledger uses `admin_cancel_at_period_end` (not `admin_inactive`). */
  let skipAdminInactiveLedgerEvent = false;

  if (hasStatus) {
    if (body.status === "active") {
      if (existing?.stripeSubscriptionId) {
        await removeStudioFeatureFromStripeBilling({
          studioId,
          featureId,
          stripeSubscriptionId: existing.stripeSubscriptionId,
          stripeSubscriptionItemId: existing.stripeSubscriptionItemId,
          featureStripePriceId: feature.stripePriceId,
        });
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
      let didScheduleStripePeriodEnd = false;
      if (existing?.stripeSubscriptionId?.trim()) {
        const subId = existing.stripeSubscriptionId.trim();
        if (body.cancelStripeAtPeriodEnd === true) {
          if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json(
              { error: "Stripe is not configured — cannot schedule cancel at period end." },
              { status: 503 },
            );
          }
          const scheduled = await scheduleStudioFeatureSubscriptionCancelAtPeriodEnd(subId, {
            scheduleEventKind: "admin_cancel_at_period_end",
          });
          if (!scheduled.ok) {
            if (scheduled.error === "multi_item_sub_cancel_at_period_end_unsupported") {
              return NextResponse.json(
                {
                  error:
                    "This studio shares one Stripe subscription across multiple add-ons. Use immediate revoke to remove billing for this SKU (prorated), or manage the subscription in Stripe.",
                  code: "MULTI_ITEM_CANCEL_AT_PERIOD_END",
                },
                { status: 409 },
              );
            }
            return NextResponse.json(
              { error: "Could not schedule cancel at period end in Stripe. Try immediate revoke." },
              { status: 502 },
            );
          }
          await setStudioFeatureRequestsDesiredForSubscription({
            studioId,
            subscriptionId: subId,
            desiredOn: false,
          });
          didScheduleStripePeriodEnd = true;
          skipAdminInactiveLedgerEvent = true;
        } else {
          await removeStudioFeatureFromStripeBilling({
            studioId,
            featureId,
            stripeSubscriptionId: existing.stripeSubscriptionId,
            stripeSubscriptionItemId: existing.stripeSubscriptionItemId,
            featureStripePriceId: feature.stripePriceId,
          });
        }
      }

      if (!didScheduleStripePeriodEnd) {
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
      }
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
    reason: hasStatus ? `${auditReason} · status:${body.status}` : `${auditReason} · overridePrice`,
  });

  if (hasStatus && body.status === "active") {
    await recordStudioFeatureActivationEvent(prisma, { studioId, featureId, kind: "admin_active" });
  }
  if (hasStatus && body.status === "inactive" && !skipAdminInactiveLedgerEvent) {
    await recordStudioFeatureActivationEvent(prisma, { studioId, featureId, kind: "admin_inactive" });
  }
  if (hasOverride) {
    await recordStudioFeatureActivationEvent(prisma, {
      studioId,
      featureId,
      kind: "admin_override_price",
      payload: { overridePriceCents: fresh?.overridePriceCents ?? null },
    });
  }

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
