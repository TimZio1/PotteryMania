import { NextResponse } from "next/server";
import type { PlatformFeatureVisibility } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VIS: PlatformFeatureVisibility[] = ["public", "hidden", "beta"];

export async function GET() {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const features = await prisma.platformFeature.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    features: features.map((f) => ({
      id: f.id,
      slug: f.slug,
      name: f.name,
      description: f.description,
      category: f.category,
      priceCents: f.priceCents,
      currency: f.currency,
      isActive: f.isActive,
      visibility: f.visibility,
      grantByDefault: f.grantByDefault,
      stripePriceId: f.stripePriceId,
      sortOrder: f.sortOrder,
      updatedAt: f.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    slug?: string;
    name?: string;
    description?: string;
    category?: string;
    priceCents?: number;
    currency?: string;
    visibility?: string;
    grantByDefault?: boolean;
    isActive?: boolean;
    sortOrder?: number;
    stripePriceId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "slug required (lowercase letters, numbers, single hyphens)" },
      { status: 400 },
    );
  }
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const taken = await prisma.platformFeature.findUnique({ where: { slug } });
  if (taken) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  const description = typeof body.description === "string" ? body.description : "";
  const category =
    typeof body.category === "string" && body.category.trim() ? body.category.trim() : "addons";
  const priceCents =
    typeof body.priceCents === "number" && Number.isFinite(body.priceCents) && body.priceCents >= 0
      ? Math.round(body.priceCents)
      : 0;
  const currency =
    typeof body.currency === "string" && body.currency.trim().length === 3
      ? body.currency.trim().toUpperCase()
      : "EUR";
  const visibility =
    typeof body.visibility === "string" && VIS.includes(body.visibility as PlatformFeatureVisibility)
      ? (body.visibility as PlatformFeatureVisibility)
      : ("public" satisfies PlatformFeatureVisibility);
  const grantByDefault = typeof body.grantByDefault === "boolean" ? body.grantByDefault : false;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;
  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder) ? Math.round(body.sortOrder) : 0;

  let stripePriceId: string | null = null;
  if (body.stripePriceId !== undefined) {
    if (body.stripePriceId === null) stripePriceId = null;
    else if (typeof body.stripePriceId === "string") {
      const t = body.stripePriceId.trim();
      if (!t.length) stripePriceId = null;
      else if (t.startsWith("price_")) stripePriceId = t;
      else {
        return NextResponse.json(
          { error: "stripePriceId must be empty or a Stripe Price id (price_…)" },
          { status: 400 },
        );
      }
    }
  }

  const created = await prisma.platformFeature.create({
    data: {
      slug,
      name,
      description,
      category,
      priceCents,
      currency,
      visibility,
      grantByDefault,
      isActive,
      sortOrder,
      stripePriceId,
    },
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "platform_feature.create",
    entityType: "platform_feature",
    entityId: created.id,
    before: null,
    after: {
      slug: created.slug,
      name: created.name,
      priceCents: created.priceCents,
      grantByDefault: created.grantByDefault,
      visibility: created.visibility,
    },
    reason: null,
  });

  return NextResponse.json({
    feature: {
      id: created.id,
      slug: created.slug,
      name: created.name,
      description: created.description,
      category: created.category,
      priceCents: created.priceCents,
      currency: created.currency,
      isActive: created.isActive,
      visibility: created.visibility,
      grantByDefault: created.grantByDefault,
      stripePriceId: created.stripePriceId,
      sortOrder: created.sortOrder,
      updatedAt: created.updatedAt.toISOString(),
    },
  });
}
