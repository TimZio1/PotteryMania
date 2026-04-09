import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ variantId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { variantId } = await ctx.params;

  const existing = await prisma.wearProductVariant.findUnique({ where: { id: variantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    label?: string;
    sku?: string | null;
    optionSize?: string | null;
    optionColor?: string | null;
    priceCents?: number | null;
    stockQuantity?: number | null;
    sortOrder?: number;
    isActive?: boolean;
  };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_wear_product_variant_patch_invalid_json", e, { variantId }, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Prisma.WearProductVariantUpdateInput = {};
  if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim();
  if (body.sku !== undefined) data.sku = typeof body.sku === "string" ? body.sku.trim() || null : null;
  if (body.optionSize !== undefined) {
    data.optionSize = typeof body.optionSize === "string" ? body.optionSize.trim() || null : null;
  }
  if (body.optionColor !== undefined) {
    data.optionColor = typeof body.optionColor === "string" ? body.optionColor.trim() || null : null;
  }
  if (body.priceCents === null) data.priceCents = null;
  else if (typeof body.priceCents === "number" && Number.isFinite(body.priceCents)) {
    data.priceCents = Math.max(0, Math.floor(body.priceCents));
  }
  if (body.stockQuantity === null) data.stockQuantity = null;
  else if (typeof body.stockQuantity === "number" && Number.isFinite(body.stockQuantity)) {
    data.stockQuantity = Math.max(0, Math.floor(body.stockQuantity));
  }
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.floor(body.sortOrder);
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  await prisma.wearProductVariant.update({
    where: { id: variantId },
    data,
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "wear_product_variant.update",
    entityType: "wear_product_variant",
    entityId: variantId,
    after: JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { variantId } = await ctx.params;

  const existing = await prisma.wearProductVariant.findUnique({ where: { id: variantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.wearProductVariant.delete({ where: { id: variantId } });

  await logAdminAction({
    actorUserId: user.id,
    action: "wear_product_variant.delete",
    entityType: "wear_product_variant",
    entityId: variantId,
  });

  return NextResponse.json({ ok: true });
}
