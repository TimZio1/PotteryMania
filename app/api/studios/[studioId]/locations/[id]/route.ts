import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

async function canManageStudio(studioId: string) {
  const user = await getSessionUser();
  if (!user) return false;
  const studio = await prisma.studio.findFirst({ where: { id: studioId, ownerUserId: user.id }, select: { id: true } });
  return Boolean(studio);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  if (!(await canManageStudio(studioId))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    name?: string;
    addressLine1?: string;
    addressLine2?: string | null;
    city?: string;
    country?: string;
    postalCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    isDefault?: boolean;
    isActive?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    name?: string;
    addressLine1?: string;
    addressLine2?: string | null;
    city?: string;
    country?: string;
    postalCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    isDefault?: boolean;
    isActive?: boolean;
  } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.addressLine1 === "string" && body.addressLine1.trim()) data.addressLine1 = body.addressLine1.trim();
  if (typeof body.addressLine2 === "string") data.addressLine2 = body.addressLine2.trim() || null;
  if (body.addressLine2 === null) data.addressLine2 = null;
  if (typeof body.city === "string" && body.city.trim()) data.city = body.city.trim();
  if (typeof body.country === "string" && body.country.trim()) data.country = body.country.trim();
  if (typeof body.postalCode === "string") data.postalCode = body.postalCode.trim() || null;
  if (body.postalCode === null) data.postalCode = null;
  if (typeof body.latitude === "number" || body.latitude === null) data.latitude = body.latitude ?? null;
  if (typeof body.longitude === "number" || body.longitude === null) data.longitude = body.longitude ?? null;
  if (typeof body.isDefault === "boolean") data.isDefault = body.isDefault;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  const existing = await prisma.studioLocation.findFirst({ where: { id, studioId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await prisma.$transaction(async (tx) => {
    if (data.isDefault === true) {
      await tx.studioLocation.updateMany({ where: { studioId }, data: { isDefault: false } });
    }
    return tx.studioLocation.update({ where: { id }, data });
  });
  return NextResponse.json({ item });
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  if (!(await canManageStudio(studioId))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.studioLocation.findFirst({ where: { id, studioId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.studioLocation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
