import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { normalizeWearSlug, isValidWearSlug } from "@/lib/wear-slug";
import { parseWearImageUrlsFromMultiline } from "@/lib/wear-admin-helpers";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const r = await prisma.wearProduct.findUnique({
    where: { id },
    include: { variants: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] } },
  });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    product: {
      id: r.id,
      slug: r.slug,
      name: r.name,
      subtitle: r.subtitle,
      description: r.description,
      priceCents: r.priceCents,
      currency: r.currency,
      images: wearImageUrlsFromJson(r.images),
      imagesText: wearImageUrlsFromJson(r.images).join("\n"),
      sortOrder: r.sortOrder,
      isActive: r.isActive,
      isFeatured: r.isFeatured,
      archivedAt: r.archivedAt?.toISOString() ?? null,
      externalFulfillmentId: r.externalFulfillmentId,
      variants: r.variants.map((v) => ({
        id: v.id,
        label: v.label,
        sku: v.sku,
        optionSize: v.optionSize,
        optionColor: v.optionColor,
        priceCents: v.priceCents,
        stockQuantity: v.stockQuantity,
        sortOrder: v.sortOrder,
        isActive: v.isActive,
      })),
    },
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const existing = await prisma.wearProduct.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    name?: string;
    slug?: string;
    subtitle?: string | null;
    description?: string | null;
    priceCents?: number;
    currency?: string;
    imagesText?: string;
    sortOrder?: number;
    isActive?: boolean;
    isFeatured?: boolean;
    externalFulfillmentId?: string | null;
    archived?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Prisma.WearProductUpdateInput = {};

  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (n) data.name = n;
  }
  if (typeof body.slug === "string") {
    const s = normalizeWearSlug(body.slug);
    if (!isValidWearSlug(s)) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }
    data.slug = s;
  }
  if (body.subtitle !== undefined) {
    data.subtitle = typeof body.subtitle === "string" ? body.subtitle.trim() || null : null;
  }
  if (body.description !== undefined) {
    data.description = typeof body.description === "string" ? body.description.trim() || null : null;
  }
  if (typeof body.priceCents === "number" && Number.isFinite(body.priceCents)) {
    data.priceCents = Math.max(0, Math.floor(body.priceCents));
  }
  if (typeof body.currency === "string" && body.currency.trim()) {
    data.currency = body.currency.trim().toUpperCase();
  }
  if (typeof body.imagesText === "string") {
    const imgs = parseWearImageUrlsFromMultiline(body.imagesText);
    if (imgs.length === 0) {
      return NextResponse.json({ error: "At least one HTTPS image URL required" }, { status: 400 });
    }
    data.images = imgs;
  }
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.floor(body.sortOrder);
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.isFeatured === "boolean") data.isFeatured = body.isFeatured;
  if (body.externalFulfillmentId !== undefined) {
    data.externalFulfillmentId =
      typeof body.externalFulfillmentId === "string" ? body.externalFulfillmentId.trim() || null : null;
  }
  if (typeof body.archived === "boolean") {
    data.archivedAt = body.archived ? new Date() : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  try {
    const updated = await prisma.wearProduct.update({
      where: { id },
      data,
    });

    await logAdminAction({
      actorUserId: user.id,
      action: "wear_product.update",
      entityType: "wear_product",
      entityId: id,
      before: { slug: existing.slug, name: existing.name },
      after: { slug: updated.slug, name: updated.name },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }
    logApiError("admin_wear_products_patch", e, { id }, req);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const existing = await prisma.wearProduct.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const orderLineCount = await prisma.wearOrderItem.count({
    where: { wearProductId: id },
  });
  if (orderLineCount > 0) {
    return NextResponse.json(
      {
        error:
          "This product is linked to past wear orders and cannot be deleted. Archive it instead to hide it from the shop.",
      },
      { status: 409 },
    );
  }

  try {
    await prisma.wearProduct.delete({ where: { id } });

    await logAdminAction({
      actorUserId: user.id,
      action: "wear_product.delete",
      entityType: "wear_product",
      entityId: id,
      before: { slug: existing.slug, name: existing.name },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    logApiError("admin_wear_products_delete", e, { id }, _req);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
