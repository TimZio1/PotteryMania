import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { logApiError } from "@/lib/monitoring";
import { logAdminAction } from "@/lib/admin-audit";
import { checkAiUserRateLimit } from "@/lib/ai/ai-rate-limiter";
import { generateProductDescription } from "@/lib/ai/product-description-generator";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))];
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rate = checkAiUserRateLimit("wear-product-description", user.id);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many AI generations. Try again shortly." }, { status: 429 });
  }

  const { id } = await ctx.params;
  const product = await prisma.wearProduct.findUnique({
    where: { id },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await generateProductDescription({
      productType: "wear",
      title: product.name,
      subtitle: product.subtitle,
      existingDescription: product.description,
      imageUrls: wearImageUrlsFromJson(product.images),
      category: "Wear",
      colors: uniqueStrings(product.variants.map((variant) => variant.optionColor)),
      sizes: uniqueStrings(product.variants.map((variant) => variant.optionSize)),
      tags: uniqueStrings(product.variants.map((variant) => variant.label)),
      priceCents: product.priceCents,
      currency: product.currency,
    });

    await prisma.wearAnalyticsEvent.create({
      data: {
        kind: "wear_ai_description_generated",
        productId: product.id,
        userId: user.id,
        payload: {
          model: result.model,
          attempts: result.attempts,
          usage: result.usage,
        },
      },
    });

    await logAdminAction({
      actorUserId: user.id,
      action: "wear_product.ai_generate_description",
      entityType: "wear_product",
      entityId: product.id,
      after: {
        model: result.model,
        attempts: result.attempts,
        usage: result.usage,
      },
      reason: "Generate AI description preview",
    });

    return NextResponse.json({ description: result.description });
  } catch (error) {
    logApiError("wear_product_ai_generate_description", error, { id, userId: user.id }, req);
    return NextResponse.json({ error: "Could not generate a description." }, { status: 502 });
  }
}
