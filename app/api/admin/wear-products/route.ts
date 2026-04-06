import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { normalizeWearSlug, isValidWearSlug } from "@/lib/wear-slug";
import { parseWearImageUrlsFromMultiline } from "@/lib/wear-admin-helpers";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const includeArchived = url.searchParams.get("includeArchived") === "1";

  const rows = await prisma.wearProduct.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: { select: { variants: true } },
    },
  });

  return NextResponse.json({
    products: rows.map((r) => ({
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
      updatedAt: r.updatedAt.toISOString(),
      variantCount: r._count.variants,
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  let slug = typeof body.slug === "string" ? normalizeWearSlug(body.slug) : "";
  if (!slug) slug = normalizeWearSlug(name);
  if (!isValidWearSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const priceCents =
    typeof body.priceCents === "number" && Number.isFinite(body.priceCents)
      ? Math.max(0, Math.floor(body.priceCents))
      : NaN;
  if (!Number.isFinite(priceCents)) {
    return NextResponse.json({ error: "priceCents required" }, { status: 400 });
  }

  const currency = (typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "EUR") || "EUR";
  const imagesText = typeof body.imagesText === "string" ? body.imagesText : "";
  const images = parseWearImageUrlsFromMultiline(imagesText);
  if (images.length === 0) {
    return NextResponse.json({ error: "At least one HTTPS image URL required" }, { status: 400 });
  }

  try {
    const created = await prisma.wearProduct.create({
      data: {
        slug,
        name,
        subtitle: typeof body.subtitle === "string" ? body.subtitle.trim() || null : null,
        description: typeof body.description === "string" ? body.description.trim() || null : null,
        priceCents,
        currency,
        images,
        sortOrder:
          typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
            ? Math.floor(body.sortOrder)
            : 0,
        isActive: body.isActive !== false,
        isFeatured: body.isFeatured === true,
        externalFulfillmentId:
          typeof body.externalFulfillmentId === "string" ? body.externalFulfillmentId.trim() || null : null,
      },
    });

    await logAdminAction({
      actorUserId: user.id,
      action: "wear_product.create",
      entityType: "wear_product",
      entityId: created.id,
      after: { slug: created.slug, name: created.name },
    });

    return NextResponse.json({ id: created.id, slug: created.slug });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }
    console.error("[admin wear-products POST]", e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
