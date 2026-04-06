import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeDomainName, stripPortFromHost } from "@/lib/vendor-domain-core";

export const dynamic = "force-dynamic";

/**
 * Used by edge middleware via fetch to primary origin (avoid Prisma on Edge).
 * Returns studio id when hostname is verified + active on a vendor domain.
 */
export async function GET(req: Request) {
  const secret = process.env.VENDOR_DOMAIN_RESOLVE_SECRET?.trim();
  if (secret) {
    const h = req.headers.get("x-potterymania-resolve-secret");
    if (h !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const u = new URL(req.url);
  const hostParam = u.searchParams.get("host");
  const host = normalizeDomainName(stripPortFromHost(hostParam) || hostParam || "");

  if (!host) {
    return NextResponse.json({ error: "host required" }, { status: 400 });
  }

  const row = await prisma.vendorDomain.findFirst({
    where: {
      domainName: host,
      isActive: true,
      verificationStatus: "verified",
    },
    select: { studioId: true },
  });

  if (!row) {
    return NextResponse.json({ studioId: null }, { status: 404 });
  }

  return NextResponse.json(
    { studioId: row.studioId },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } },
  );
}
