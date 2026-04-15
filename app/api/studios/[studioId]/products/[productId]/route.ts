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

type Ctx = { params: Promise<{ studioId: string; productId: string }> };

type ProductVariantInput = {
  id?: string;
  name?: string;
  sku?: string | null;
  priceCents?: number | null;
  stockQuantity?: number | null;
  sortOrder?: number;
};

async function assertProduct(studioId: string, productId: string) {
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) return null;
  const product = await prisma.product.findFirst({
    where: { id: productId, studioId },
  });
  if (!product) return null;
  return { studio, product };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId, productId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return apiError(auth.error, auth.status);
  const pair = await assertProduct(studioId, productId);
  if (!pair) return apiError("Not found", 404);
  if (pair.studio.status === "suspended") {
    return apiError("Studio suspended", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  if (body.status === "active") {
    const stripeRow = await prisma.stripeAccount.findUnique({ where: { studioId } });
    if (!stripeRow?.chargesEnabled || !stripeRow?.payoutsEnabled) {
      return NextResponse.json({ error: studioCanOperateMessage() }, { status: 403 });
    }
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
  if (typeof body.category === "string") {
    const category = ceramicCategoryFromSlug(body.category);
    if (!category) {
      return apiError("Invalid ceramic category", 400);
    }
    try {
      await syncLockedCeramicCategories(prisma);
      const categoryMeta = await prisma.productCategory.findUnique({
        where: { slug: ceramicCategoryMetaByValue(category).slug },
        select: { id: true },
      });
      data.categoryId = categoryMeta?.id ?? null;
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
  if (body.subcategory === null || typeof body.subcategory === "string") {
    data.subcategory = typeof body.subcategory === "string" ? body.subcategory.trim() || null : null;
  }
  if (typeof body.materials === "string") data.materials = body.materials;
  if (typeof body.careInstructions === "string") data.careInstructions = body.careInstructions;
  if (body.weightGrams === null || typeof body.weightGrams === "number") data.weightGrams = body.weightGrams;
  if (body.dimensionsText === null || typeof body.dimensionsText === "string") data.dimensionsText = body.dimensionsText;
  if (typeof body.shippingNotes === "string") data.shippingNotes = body.shippingNotes;
  if (typeof body.returnNotes === "string") data.returnNotes = body.returnNotes;
  if ("shippingZones" in body) {
    const parsed = parseShippingZonesInput(body.shippingZones);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    data.shippingDomesticCents = parsed.value.shippingDomesticCents;
    data.shippingEuropeCents = parsed.value.shippingEuropeCents;
    data.shippingUsaCents = parsed.value.shippingUsaCents;
    data.shippingCanadaCents = parsed.value.shippingCanadaCents;
    data.shippingAsiaCents = parsed.value.shippingAsiaCents;
  }
  if (body.status === "draft" || body.status === "active" || body.status === "inactive" || body.status === "archived") {
    data.status = body.status;
  }
  if (typeof body.isFeatured === "boolean") data.isFeatured = body.isFeatured;
  if ("variants" in body && body.variants != null && !Array.isArray(body.variants)) {
    return apiError("variants must be an array", 400);
  }

  const pricingKeys = [
    "pricingType",
    "recurringPriceCents",
    "billingInterval",
    "billingIntervalCount",
    "minimumCommitmentCycles",
    "autoRenew",
    "trialPeriodDays",
    "cancellationPolicyText",
    "gracePeriodDays",
    "paymentRetryMax",
    "failedPaymentAction",
  ];
  const touchesPricing = pricingKeys.some((k) => k in body);
  if (touchesPricing) {
    const pricing = normalizeOfferingPricing({
      pricingType: "pricingType" in body ? body.pricingType : pair.product.pricingType,
      recurringPriceCents: "recurringPriceCents" in body ? body.recurringPriceCents : pair.product.recurringPriceCents,
      billingInterval: "billingInterval" in body ? body.billingInterval : pair.product.billingInterval,
      billingIntervalCount:
        "billingIntervalCount" in body ? body.billingIntervalCount : pair.product.billingIntervalCount,
      minimumCommitmentCycles:
        "minimumCommitmentCycles" in body ? body.minimumCommitmentCycles : pair.product.minimumCommitmentCycles,
      autoRenew: "autoRenew" in body ? body.autoRenew : pair.product.autoRenew,
      trialPeriodDays: "trialPeriodDays" in body ? body.trialPeriodDays : pair.product.trialPeriodDays,
      cancellationPolicyText:
        "cancellationPolicyText" in body ? body.cancellationPolicyText : pair.product.cancellationPolicyText,
      gracePeriodDays: "gracePeriodDays" in body ? body.gracePeriodDays : pair.product.gracePeriodDays,
      paymentRetryMax: "paymentRetryMax" in body ? body.paymentRetryMax : pair.product.paymentRetryMax,
      failedPaymentAction:
        "failedPaymentAction" in body ? body.failedPaymentAction : pair.product.failedPaymentAction,
    });
    if (!pricing.ok) {
      return NextResponse.json({ error: pricing.error }, { status: 400 });
    }
    data.pricingType = pricing.value.pricingType;
    data.recurringPriceCents = pricing.value.recurringPriceCents;
    data.billingInterval = pricing.value.billingInterval;
    data.billingIntervalCount = pricing.value.billingIntervalCount;
    data.minimumCommitmentCycles = pricing.value.minimumCommitmentCycles;
    data.autoRenew = pricing.value.autoRenew;
    data.trialPeriodDays = pricing.value.trialPeriodDays;
    data.cancellationPolicyText = pricing.value.cancellationPolicyText;
    data.gracePeriodDays = pricing.value.gracePeriodDays;
    data.paymentRetryMax = pricing.value.paymentRetryMax;
    data.failedPaymentAction = pricing.value.failedPaymentAction;
    data.pricingVersion = pair.product.pricingVersion + 1;
  }
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
  if (Array.isArray(body.variants)) {
    const variantsInput = body.variants as ProductVariantInput[];
    const variantNames = new Set<string>();
    for (let i = 0; i < variantsInput.length; i += 1) {
      const row = variantsInput[i];
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!name) {
        return NextResponse.json({ error: `Variant #${i + 1} requires a name` }, { status: 400 });
      }
      const key = name.toLowerCase();
      if (variantNames.has(key)) {
        return NextResponse.json({ error: `Duplicate variant name: ${name}` }, { status: 400 });
      }
      variantNames.add(key);
      if (row.priceCents != null && (typeof row.priceCents !== "number" || row.priceCents < 0)) {
        return NextResponse.json({ error: `Variant #${i + 1} has invalid price` }, { status: 400 });
      }
      if (row.stockQuantity != null && (typeof row.stockQuantity !== "number" || row.stockQuantity < 0)) {
        return NextResponse.json({ error: `Variant #${i + 1} has invalid stock quantity` }, { status: 400 });
      }
    }
    data.variants = {
      deleteMany: {},
      create: variantsInput.map((row, idx) => ({
        name: (row.name ?? "").trim(),
        sku: typeof row.sku === "string" ? row.sku.trim() || null : null,
        priceCents: typeof row.priceCents === "number" ? row.priceCents : null,
        stockQuantity: typeof row.stockQuantity === "number" ? row.stockQuantity : null,
        sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : idx,
      })),
    };
  }

  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: data as object,
      include: { images: true, variants: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    });
    return apiSuccess({ product });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
      return NextResponse.json(
        { error: "Products are temporarily unavailable while schema updates finish deploying." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Update failed (slug conflict?)" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { studioId, productId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return apiError(auth.error, auth.status);
  const pair = await assertProduct(studioId, productId);
  if (!pair) return apiError("Not found", 404);
  await prisma.product.update({
    where: { id: productId },
    data: { status: "archived" },
  });
  return apiSuccess({ ok: true });
}