import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

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
