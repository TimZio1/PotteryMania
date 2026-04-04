import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { listStudioFeaturesForVendor } from "@/lib/studio-features";

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
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
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

  const now = new Date();
  await prisma.studioFeatureActivation.upsert({
    where: { studioId_featureId: { studioId, featureId: feature.id } },
    create: {
      studioId,
      featureId: feature.id,
      status: desiredOn ? "active" : "inactive",
      activatedAt: desiredOn ? now : null,
    },
    update: {
      status: desiredOn ? "active" : "inactive",
      activatedAt: desiredOn ? now : null,
    },
  });

  await prisma.studioFeatureRequest.upsert({
    where: { studioId_featureKey: { studioId, featureKey: slug } },
    create: { studioId, featureKey: slug, desiredOn },
    update: { desiredOn },
  });

  return NextResponse.json({ ok: true, slug, featureKey: slug, desiredOn, active: desiredOn });
}
