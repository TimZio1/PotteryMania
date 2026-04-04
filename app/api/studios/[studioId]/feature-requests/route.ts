import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { STUDIO_FEATURE_CATALOG } from "@/lib/studio-feature-catalog";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await prisma.studioFeatureRequest.findMany({ where: { studioId } });
  const byKey = Object.fromEntries(rows.map((r) => [r.featureKey, r.desiredOn]));
  return NextResponse.json({ desiredByKey: byKey });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { featureKey?: string; desiredOn?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const featureKey = typeof body.featureKey === "string" ? body.featureKey.trim() : "";
  if (!STUDIO_FEATURE_CATALOG.some((f) => f.key === featureKey)) {
    return NextResponse.json({ error: "Unknown feature" }, { status: 400 });
  }
  const desiredOn = Boolean(body.desiredOn);

  await prisma.studioFeatureRequest.upsert({
    where: { studioId_featureKey: { studioId, featureKey } },
    create: { studioId, featureKey, desiredOn },
    update: { desiredOn },
  });

  return NextResponse.json({ ok: true, featureKey, desiredOn });
}
