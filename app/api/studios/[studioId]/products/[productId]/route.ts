import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { slugify } from "@/lib/slug";
import { ceramicCategoryFromSlug, ceramicCategoryMetaByValue, syncLockedCeramicCategories } from "@/lib/ceramic-categories";
import { normalizeOfferingPricing } from "@/lib/offering-pricing";
import { studioCanOperateMessage } from "@/lib/studio-operating-gates";
import { parseShippingZonesInput } from "@/lib/shipping-zones";

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
  if (pair.studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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
      return NextResponse.json({ error: "Invalid ceramic category" }, { status: 400 });
    }
    await syncLockedCeramicCategories(prisma);
    const categoryMeta = await prisma.productCategory.findUnique({
      where: { slug: ceramicCategoryMetaByValue(category).slug },
      select: { id: true },
    });
    data.categoryId = categoryMeta?.id ?? null;
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

  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: data as object,
      include: { images: true },
    });
    return NextResponse.json({ product });
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