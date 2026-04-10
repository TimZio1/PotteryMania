import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isRuntimeFlagEnabled, RUNTIME_FLAG_KEYS } from "@/lib/runtime-feature-flags";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const discoveryEnabled = await isRuntimeFlagEnabled(RUNTIME_FLAG_KEYS.publicDiscoveryEnabled, false);
  if (!discoveryEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const city = searchParams.get("city")?.trim();
  const country = searchParams.get("country")?.trim();
  const sort = searchParams.get("sort")?.trim();

  const studios = await prisma.studio.findMany({
    where: {
      status: "approved",
      ...(q
        ? {
            OR: [
              { displayName: { contains: q, mode: "insensitive" } },
              { shortDescription: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      ...(country ? { country: { contains: country, mode: "insensitive" } } : {}),
    },
    orderBy:
      sort === "name"
        ? { displayName: "asc" }
        : [{ marketplaceRankWeight: "desc" }, { displayName: "asc" }],
    include: {
      _count: {
        select: {
          products: true,
          experiences: true,
        },
      },
    },
  });

  return NextResponse.json({ studios });
}
