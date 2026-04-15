import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const items = await prisma.studioLocation.findMany({
    where: { studioId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: {
    name?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const addressLine1 = typeof body.addressLine1 === "string" ? body.addressLine1.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";
  if (!name || !addressLine1 || !city || !country) {
    return NextResponse.json({ error: "name, addressLine1, city, country required" }, { status: 400 });
  }

  const item = await prisma.$transaction(async (tx) => {
    if (body.isDefault === true) {
      await tx.studioLocation.updateMany({ where: { studioId }, data: { isDefault: false } });
    }
    return tx.studioLocation.create({
      data: {
        studioId,
        name,
        addressLine1,
        addressLine2: typeof body.addressLine2 === "string" && body.addressLine2.trim() ? body.addressLine2.trim() : null,
        city,
        country,
        postalCode: typeof body.postalCode === "string" && body.postalCode.trim() ? body.postalCode.trim() : null,
        latitude: typeof body.latitude === "number" && Number.isFinite(body.latitude) ? body.latitude : null,
        longitude: typeof body.longitude === "number" && Number.isFinite(body.longitude) ? body.longitude : null,
        isDefault: body.isDefault === true,
      },
    });
  });

  return NextResponse.json({ item }, { status: 201 });
}
