import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";
import { normalizeWearAffiliateCode } from "@/lib/wear-affiliate-code";

type Ctx = { params: Promise<{ code: string }> };

/**
 * Partner short link: `/w/{code}` → global wear shop with `?ref=` studio id (30-day attribution).
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { code: raw } = await ctx.params;
  const code = normalizeWearAffiliateCode(raw);
  if (!code) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const config = await prisma.studioWearConfig.findFirst({
    where: { wearAffiliateCode: code, enabled: true },
    select: { studioId: true },
  });

  if (!config) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const base = resolvePublicSiteUrl();
  const url = new URL("/wear/shop", base.endsWith("/") ? base.slice(0, -1) : base);
  url.searchParams.set("ref", config.studioId);
  return NextResponse.redirect(url, 302);
}
