import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { ceramicCategoryFromSlug, ceramicCategoryMetaByValue, syncLockedCeramicCategories } from "@/lib/ceramic-categories";
import { normalizeOfferingPricing } from "@/lib/offering-pricing";
import { studioCanOperateMessage } from "@/lib/studio-operating-gates";
import { parseShippingZonesInput } from "@/lib/shipping-zones";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string }> };

type ProductVariantInput = {
  id?: string;
  name?: string;
  sku?: string | null;
  priceCents?: number | null;
  stockQuantity?: number | null;
  sortOrder?: number;
};

export async function GET(_req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return apiError(auth.error, auth.status);

  let products: unknown;
  try {
    products = await prisma.product.findMany({
      where: { studioId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        fullDescription: true,
        priceCents: true,
        salePriceCents: true,
        sku: true,
        stockQuantity: true,
        stockStatus: true,
        subcategory: true,
        materials: true,
        careInstructions: true,
        weightGrams: true,
        dimensionsText: true,
        shippingNotes: true,
        returnNotes: true,
        status: true,
        isFeatured: true,
        pricingType: true,
        recurringPriceCents: true,
        billingInterval: true,
        billingIntervalCount: true,
        minimumCommitmentCycles: true,
        autoRenew: true,
        trialPeriodDays: true,
        cancellationPolicyText: true,
        gracePeriodDays: true,
        paymentRetryMax: true,
        failedPaymentAction: true,
        shippingDomesticCents: true,
        shippingEuropeCents: true,
        shippingUsaCents: true,
        shippingCanadaCents: true,
        shippingAsiaCents: true,
        images: true,
        variants: {
          select: {
            id: true,
            name: true,
            sku: true,
            priceCents: true,
            stockQuantity: true,
            sortOrder: true,
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        categoryMeta: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
      return NextResponse.json(
        { error: "Products are temporarily unavailable while schema updates finish deploying." },
        { status: 503 },
      );
    }
    throw error;
  }
  return apiSuccess({ products });
}

export async function POST(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return apiError(auth.error, auth.status);
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) return apiError("Studio not found", 404);
  if (studio.status === "suspended") {
    return apiError("Studio suspended", 403);
  }
  let body: {
    title?: string;
    slug?: string;
    shortDescription?: string;
    fullDescription?: string;
    priceCents?: number;
    salePriceCents?: number | null;
    sku?: string | null;
    stockQuantity?: number;
    stockStatus?: string;
    categoryId?: string | null;
    category?: string;
    subcategory?: string | null;
    materials?: string | null;
    careInstructions?: string | null;
    weightGrams?: number | null;
    dimensionsText?: string | null;
    shippingNotes?: string | null;
    returnNotes?: string | null;
    status?: string;
    isFeatured?: boolean;
    pricingType?: string;
    recurringPriceCents?: number | null;
    billingInterval?: string | null;
    billingIntervalCount?: number | null;
    minimumCommitmentCycles?: number | null;
    autoRenew?: boolean;
    trialPeriodDays?: number | null;
    cancellationPolicyText?: string | null;
    gracePeriodDays?: number | null;
    paymentRetryMax?: number | null;
    failedPaymentAction?: string;
    shippingZones?: {
      domestic?: number | null;
      europe?: number | null;
      usa?: number | null;
      canada?: number | null;
      asia?: number | null;
    };
    images?: { imageUrl: string; altText?: string; isPrimary?: boolean }[];
    variants?: ProductVariantInput[];
  };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return apiError("title required", 400);
  const category = ceramicCategoryFromSlug(typeof body.category === "string" ? body.category : "") ?? "tableware";
  const subcategory = typeof body.subcategory === "string" ? body.subcategory.trim() || null : null;
  const priceCents = typeof body.priceCents === "number" ? body.priceCents : -1;
  if (priceCents < 0) return apiError("priceCents required", 400);

  let slug = typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : slugify(title);
  const clash = await prisma.product.findUnique({
    where: { studioId_slug: { studioId, slug } },
  });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const images = Array.isArray(body.images) ? body.images : [];
  const variantsInput = Array.isArray(body.variants) ? body.variants : [];
  const primaryCount = images.filter((i) => i.isPrimary).length;
  if (images.length > 0 && primaryCount !== 1) {
    return apiError("Exactly one primary image when images provided", 400);
  }
  const variantNames = new Set<string>();
  for (let i = 0; i < variantsInput.length; i += 1) {
    const row = variantsInput[i];
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) {
      return apiError(`Variant #${i + 1} requires a name`, 400);
    }
    const key = name.toLowerCase();
    if (variantNames.has(key)) {
      return apiError(`Duplicate variant name: ${name}`, 400);
    }
    variantNames.add(key);
    if (row.priceCents != null && (typeof row.priceCents !== "number" || row.priceCents < 0)) {
      return apiError(`Variant #${i + 1} has invalid price`, 400);
    }
    if (row.stockQuantity != null && (typeof row.stockQuantity !== "number" || row.stockQuantity < 0)) {
      return apiError(`Variant #${i + 1} has invalid stock quantity`, 400);
    }
  }

  const status =
    body.status === "active" || body.status === "draft" || body.status === "inactive" || body.status === "archived"
      ? body.status
      : "draft";

  const stripeRow = await prisma.stripeAccount.findUnique({ where: { studioId } });
  if (status === "active" && (!stripeRow?.chargesEnabled || !stripeRow.payoutsEnabled)) {
    return apiError(studioCanOperateMessage(), 403);
  }

  const pricing = normalizeOfferingPricing(body);
  if (!pricing.ok) {
    return apiError(pricing.error, 400);
  }
  const shippingZones = parseShippingZonesInput(body.shippingZones);
  if (!shippingZones.ok) {
    return apiError(shippingZones.error, 400);
  }

  try {
    await syncLockedCeramicCategories(prisma);
    const categorySlug = ceramicCategoryMetaByValue(category).slug;
    const categoryMeta = await prisma.productCategory.findUnique({
      where: { slug: categorySlug },
      select: { id: true },
    });

    const product = await prisma.product.create({
      data: {
        studioId,
        subcategory,
        title,
        slug,
        shortDescription: body.shortDescription?.trim() || null,
        fullDescription: body.fullDescription?.trim() || null,
        priceCents,
        salePriceCents: body.salePriceCents ?? null,
        pricingType: pricing.value.pricingType,
        recurringPriceCents: pricing.value.recurringPriceCents,
        billingInterval: pricing.value.billingInterval,
        billingIntervalCount: pricing.value.billingIntervalCount,
        minimumCommitmentCycles: pricing.value.minimumCommitmentCycles,
        autoRenew: pricing.value.autoRenew,
        trialPeriodDays: pricing.value.trialPeriodDays,
        cancellationPolicyText: pricing.value.cancellationPolicyText,
        gracePeriodDays: pricing.value.gracePeriodDays,
        paymentRetryMax: pricing.value.paymentRetryMax,
        failedPaymentAction: pricing.value.failedPaymentAction,
        sku: body.sku ?? null,
        stockQuantity: body.stockQuantity ?? 0,
        stockStatus:
          body.stockStatus === "out_of_stock" || body.stockStatus === "backorder" ? body.stockStatus : "in_stock",
        categoryId: categoryMeta?.id ?? body.categoryId ?? null,
        materials: body.materials ?? null,
        careInstructions: body.careInstructions ?? null,
        weightGrams: body.weightGrams ?? null,
        dimensionsText: body.dimensionsText ?? null,
        shippingDomesticCents: shippingZones.value.shippingDomesticCents,
        shippingEuropeCents: shippingZones.value.shippingEuropeCents,
        shippingUsaCents: shippingZones.value.shippingUsaCents,
        shippingCanadaCents: shippingZones.value.shippingCanadaCents,
        shippingAsiaCents: shippingZones.value.shippingAsiaCents,
        shippingNotes: body.shippingNotes ?? null,
        returnNotes: body.returnNotes ?? null,
        status: status as "draft" | "active" | "inactive" | "archived",
        isFeatured: Boolean(body.isFeatured),
        images: {
          create: images.map((im, idx) => ({
            imageUrl: im.imageUrl,
            altText: im.altText ?? null,
            sortOrder: idx,
            isPrimary: Boolean(im.isPrimary),
          })),
        },
        variants: variantsInput.length
          ? {
              create: variantsInput.map((row, idx) => ({
                name: (row.name ?? "").trim(),
                sku: typeof row.sku === "string" ? row.sku.trim() || null : null,
                priceCents: typeof row.priceCents === "number" ? row.priceCents : null,
                stockQuantity: typeof row.stockQuantity === "number" ? row.stockQuantity : null,
                sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : idx,
              })),
            }
          : undefined,
      },
      include: { images: true, variants: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    });

    return apiSuccess({ product }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
      return NextResponse.json(
        { error: "Products are temporarily unavailable while schema updates finish deploying." },
        { status: 503 },
      );
    }
    throw error;
  }
}