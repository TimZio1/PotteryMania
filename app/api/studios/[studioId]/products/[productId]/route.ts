import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { slugify } from "@/lib/slug";

type Ctx = { params: Promise<{ studioId: string; productId: string }> };

async function assertProduct(studioId: string, productId: string, userId: string) {
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== userId) return null;
  const product = await prisma.product.findFirst({
    where: { id: productId, studioId },
  });
  if (!product) return null;
  return { studio, product };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, productId } = await ctx.params;
  const pair = await assertProduct(studioId, productId, user.id);
  if (!pair) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pair.studio.status !== "approved") {
    return NextResponse.json({ error: "Studio not approved" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.slug === "string") data.slug = slugify(body.slug);
  if (typeof body.shortDescription === "string") data.shortDescription = body.shortDescription;
  if (typeof body.fullDescription === "string") data.fullDescription = body.fullDescription;
  if (typeof body.priceCents === "number") data.priceCents = body.priceCents;
  if (body.salePriceCents === null || typeof body.salePriceCents === "number") data.salePriceCents = body.salePriceCents;
  if (body.sku === null || typeof body.sku === "string") data.sku = body.sku;
  if (typeof body.stockQuantity === "number") data.stockQuantity = body.stockQuantity;
  if (
    body.stockStatus === "in_stock" ||
    body.stockStatus === "out_of_stock" ||
    body.stockStatus === "backorder"
  ) {
    data.stockStatus = body.stockStatus;
  }
  if (body.categoryId === null || typeof body.categoryId === "string") data.categoryId = body.categoryId;
  if (typeof body.materials === "string") data.materials = body.materials;
  if (typeof body.careInstructions === "string") data.careInstructions = body.careInstructions;
  if (body.weightGrams === null || typeof body.weightGrams === "number") data.weightGrams = body.weightGrams;
  if (body.dimensionsText === null || typeof body.dimensionsText === "string") data.dimensionsText = body.dimensionsText;
  if (typeof body.shippingNotes === "string") data.shippingNotes = body.shippingNotes;
  if (typeof body.returnNotes === "string") data.returnNotes = body.returnNotes;
  if (body.status === "draft" || body.status === "active" || body.status === "inactive" || body.status === "archived") {
    data.status = body.status;
  }
  if (typeof body.isFeatured === "boolean") data.isFeatured = body.isFeatured;
  if (Array.isArray(body.images)) {
    const images = body.images.filter((img): img is { imageUrl: string; altText?: string | null; isPrimary?: boolean } => {
      return Boolean(img && typeof img === "object" && typeof (img as { imageUrl?: unknown }).imageUrl === "string");
    });
    const primaryCount = images.filter((im) => Boolean(im.isPrimary)).length;
    if (images.length > 0 && primaryCount !== 1) {
      return NextResponse.json({ error: "Exactly one primary image when images provided" }, { status: 400 });
    }
    data.images = {
      deleteMany: {},
      create: images.map((im, idx) => ({
        imageUrl: im.imageUrl.trim(),
        altText: im.altText?.trim() || null,
        sortOrder: idx,
        isPrimary: Boolean(im.isPrimary),
      })),
    };
  }

  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: data as object,
      include: { images: true },
    });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Update failed (slug conflict?)" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, productId } = await ctx.params;
  const pair = await assertProduct(studioId, productId, user.id);
  if (!pair) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.product.update({
    where: { id: productId },
    data: { status: "archived" },
  });
  return NextResponse.json({ ok: true });
}