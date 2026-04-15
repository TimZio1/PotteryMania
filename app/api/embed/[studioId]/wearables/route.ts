import { NextResponse } from "next/server";
import { getStudioWearProducts } from "@/lib/studio-wear-catalog";
import { prisma } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ studioId: string }> };

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: Request, ctx: Ctx) {
  const rate = assertRateLimit(req, "embed_wear", 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: corsHeaders() },
    );
  }

  const { studioId } = await ctx.params;

  const studio = await prisma.studio.findFirst({
    where: { id: studioId, status: "approved" },
    select: { displayName: true },
  });
  if (!studio) {
    return NextResponse.json(
      { error: "Studio not found" },
      { status: 404, headers: corsHeaders() },
    );
  }

  const items = await getStudioWearProducts(studioId);
  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: "Wearables not enabled" },
      { status: 404, headers: corsHeaders() },
    );
  }

  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://potterymania.com";

  return NextResponse.json(
    {
      studio: { id: studioId, name: studio.displayName },
      products: items.map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle,
        priceCents: p.priceCents,
        priceFormatted: `€${(p.priceCents / 100).toFixed(2)}`,
        image: p.image,
        url: `${baseUrl}/studios/${studioId}/wearables/${p.slug}`,
      })),
    },
    { headers: corsHeaders() },
  );
}
