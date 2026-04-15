import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";
import {
  resolveWearGlobalPricing,
  resolveStudioMarginBps,
  calculateWearPrice,
} from "@/lib/wear-commission";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [config, global, catalog] = await Promise.all([
    prisma.studioWearConfig.findUnique({ where: { studioId } }),
    resolveWearGlobalPricing(),
    prisma.wearProduct.findMany({
      where: { isActive: true, archivedAt: null },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, priceCents: true, images: true, slug: true },
    }),
  ]);

  const selectedIds = config
    ? (await prisma.studioWearProduct.findMany({
        where: { studioId },
        select: { wearProductId: true },
      })).map((r) => r.wearProductId)
    : [];

  const effectiveMarginBps = config
    ? resolveStudioMarginBps(config.marginBps, global)
    : global.defaultMarginBps;

  return NextResponse.json({
    enabled: config?.enabled ?? false,
    marginBps: effectiveMarginBps,
    marginLocked: global.marginLocked || (config?.marginLocked ?? false),
    minMarginBps: global.minMarginBps,
    maxMarginBps: global.maxMarginBps,
    selectedProductIds: selectedIds,
    catalog: catalog.map((p) => ({
      id: p.id,
      name: p.name,
      basePriceCents: p.priceCents,
      finalPriceCents: calculateWearPrice(p.priceCents, effectiveMarginBps),
      image: wearImageUrlsFromJson(p.images)[0] ?? null,
    })),
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: {
    enabled?: boolean;
    marginBps?: number;
    selectedProductIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const global = await resolveWearGlobalPricing();

  const config = await prisma.studioWearConfig.upsert({
    where: { studioId },
    create: {
      studioId,
      enabled: body.enabled ?? false,
      marginBps: typeof body.marginBps === "number"
        ? resolveStudioMarginBps(body.marginBps, global)
        : global.defaultMarginBps,
    },
    update: {
      ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
      ...(typeof body.marginBps === "number" && !global.marginLocked
        ? { marginBps: resolveStudioMarginBps(body.marginBps, global) }
        : {}),
    },
  });

  if (Array.isArray(body.selectedProductIds)) {
    const validIds = body.selectedProductIds.filter((id) => typeof id === "string" && id.length > 0);
    await prisma.$transaction(async (tx) => {
      await tx.studioWearProduct.deleteMany({ where: { studioId } });
      if (validIds.length > 0) {
        const existing = await tx.wearProduct.findMany({
          where: { id: { in: validIds }, isActive: true, archivedAt: null },
          select: { id: true },
        });
        const existingSet = new Set(existing.map((p) => p.id));
        await tx.studioWearProduct.createMany({
          data: validIds
            .filter((id) => existingSet.has(id))
            .map((id, i) => ({ studioId, wearProductId: id, sortOrder: i })),
        });
      }
    });
  }

  return NextResponse.json({
    enabled: config.enabled,
    marginBps: config.marginBps,
  });
}
