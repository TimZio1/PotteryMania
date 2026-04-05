import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { featureBundleToDto } from "@/lib/admin-feature-bundle-dto";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET() {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const bundles = await prisma.featureBundle.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { feature: true },
      },
    },
  });

  return NextResponse.json({
    bundles: bundles.map(featureBundleToDto),
  });
}

export async function POST(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    slug?: string;
    name?: string;
    description?: string;
    priceCents?: number;
    currency?: string;
    isActive?: boolean;
    sortOrder?: number;
    validFrom?: string | null;
    validUntil?: string | null;
    stripePriceId?: string | null;
    featureIds?: string[];
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

  const taken = await prisma.featureBundle.findUnique({ where: { slug } });
  if (taken) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  const featureIds = Array.isArray(body.featureIds) ? body.featureIds.filter((x) => typeof x === "string") : [];
  const uniqueIds = [...new Set(featureIds)];
  if (uniqueIds.length === 0) {
    return NextResponse.json({ error: "featureIds must include at least one catalog feature" }, { status: 400 });
  }

  const features = await prisma.platformFeature.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });
  if (features.length !== uniqueIds.length) {
    return NextResponse.json({ error: "One or more feature ids are invalid" }, { status: 400 });
  }

  const description = typeof body.description === "string" ? body.description : "";
  const priceCents =
    typeof body.priceCents === "number" && Number.isFinite(body.priceCents) && body.priceCents >= 0
      ? Math.round(body.priceCents)
      : 0;
  const currency =
    typeof body.currency === "string" && body.currency.trim().length === 3
      ? body.currency.trim().toUpperCase()
      : "EUR";
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;
  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder) ? Math.round(body.sortOrder) : 0;

  function parseWindowField(v: string | null | undefined): Date | null {
    if (v === undefined || v === null || v === "") return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const validFrom = parseWindowField(body.validFrom);
  const validUntil = parseWindowField(body.validUntil);
  if (
    (body.validFrom !== undefined && body.validFrom !== null && body.validFrom !== "" && validFrom === null) ||
    (body.validUntil !== undefined && body.validUntil !== null && body.validUntil !== "" && validUntil === null)
  ) {
    return NextResponse.json({ error: "validFrom and validUntil must be valid ISO dates when set" }, { status: 400 });
  }

  let stripePriceId: string | null = null;
  if (body.stripePriceId !== undefined) {
    if (body.stripePriceId === null) stripePriceId = null;
    else if (typeof body.stripePriceId === "string") {
      const t = body.stripePriceId.trim();
      stripePriceId = t.length ? t : null;
    }
  }

  const created = await prisma.featureBundle.create({
    data: {
      slug,
      name,
      description,
      priceCents,
      currency,
      isActive,
      sortOrder,
      validFrom,
      validUntil,
      stripePriceId,
      items: {
        create: featureIds.map((featureId, idx) => ({
          featureId,
          sortOrder: idx,
        })),
      },
    },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { feature: true },
      },
    },
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "feature_bundle.create",
    entityType: "feature_bundle",
    entityId: created.id,
    after: {
      slug: created.slug,
      name: created.name,
      priceCents: created.priceCents,
      featureCount: created.items.length,
    },
    reason: null,
  });

  return NextResponse.json({ bundle: featureBundleToDto(created) });
}
