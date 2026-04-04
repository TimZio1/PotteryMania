import { NextResponse } from "next/server";
import type { PlatformFeatureVisibility, StudioFeatureActivationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

function activationGrantsAccess(status: StudioFeatureActivationStatus, trialEndsAt: Date | null, deactivatesAt: Date | null) {
  const now = new Date();
  if (status === "active") return true;
  if (status === "trialing") return trialEndsAt != null && trialEndsAt > now;
  if (status === "pending_cancel") {
    if (!deactivatesAt) return true;
    return deactivatesAt > now;
  }
  return false;
}

/** Runtime entitlement (used for API gating). When `grantByDefault` is true, all studios are entitled. */
export async function hasStudioFeature(studioId: string, slug: string): Promise<boolean> {
  const feature = await prisma.platformFeature.findUnique({ where: { slug } });
  if (!feature?.isActive) return false;
  if (feature.grantByDefault) return true;
  const act = await prisma.studioFeatureActivation.findUnique({
    where: { studioId_featureId: { studioId, featureId: feature.id } },
  });
  if (!act) return false;
  return activationGrantsAccess(act.status, act.trialEndsAt, act.deactivatesAt);
}

export async function kilnFeatureDeniedResponse(studioId: string) {
  if (await hasStudioFeature(studioId, "kiln_tracking")) return null;
  return NextResponse.json(
    { error: "Kiln & production is not enabled for this studio. Turn it on under Features / Add-ons." },
    { status: 403 },
  );
}

export type StudioFeatureListRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  currency: string;
  preferenceOn: boolean;
  entitled: boolean;
  platformActive: boolean;
  visibility: PlatformFeatureVisibility;
  /** True when the platform grants this to everyone (`grantByDefault`); access does not depend on the toggle yet. */
  includedForAll: boolean;
  /** Hyperadmin set `stripePriceId` and turned off grant-by-default — checkout is required to enable. */
  requiresPaidSubscription: boolean;
};

function computeRequiresPaidSubscription(f: {
  isActive: boolean;
  grantByDefault: boolean;
  stripePriceId: string | null;
}) {
  if (!f.isActive || f.grantByDefault) return false;
  const id = f.stripePriceId?.trim();
  return Boolean(id && id.startsWith("price_"));
}

function computeEntitled(
  f: { isActive: boolean; grantByDefault: boolean },
  act: { status: StudioFeatureActivationStatus; trialEndsAt: Date | null; deactivatesAt: Date | null } | undefined,
) {
  if (!f.isActive) return false;
  if (f.grantByDefault) return true;
  if (!act) return false;
  return activationGrantsAccess(act.status, act.trialEndsAt, act.deactivatesAt);
}

/** Studio owner UI: catalog rows + preference + effective entitlement. */
export async function listStudioFeaturesForVendor(studioId: string): Promise<StudioFeatureListRow[]> {
  const features = await prisma.platformFeature.findMany({
    where: { visibility: { in: ["public", "beta"] } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      activations: { where: { studioId }, take: 1 },
    },
  });

  const rows: StudioFeatureListRow[] = [];
  for (const f of features) {
    const act = f.activations[0];
    const preferenceOn = act ? activationGrantsAccess(act.status, act.trialEndsAt, act.deactivatesAt) : false;
    const entitled = computeEntitled(f, act);
    rows.push({
      id: f.id,
      slug: f.slug,
      name: f.name,
      description: f.description,
      category: f.category,
      priceCents: f.priceCents,
      currency: f.currency,
      preferenceOn,
      entitled,
      platformActive: f.isActive,
      visibility: f.visibility,
      includedForAll: f.grantByDefault && f.isActive,
      requiresPaidSubscription: computeRequiresPaidSubscription(f),
    });
  }
  return rows;
}
