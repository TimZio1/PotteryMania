import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : undefined);
  const num = (k: string) => (typeof body[k] === "number" ? (body[k] as number) : undefined);

  const data: Record<string, unknown> = {};
  const keys = [
    "displayName",
    "legalBusinessName",
    "vatNumber",
    "responsiblePersonName",
    "email",
    "phone",
    "country",
    "city",
    "addressLine1",
    "addressLine2",
    "postalCode",
    "shortDescription",
    "longDescription",
    "logoUrl",
    "coverImageUrl",
    "instagramUrl",
    "facebookUrl",
    "websiteUrl",
    "preferredLanguage",
    "preferredCurrency",
  ] as const;
  for (const k of keys) {
    const v = str(k);
    if (v !== undefined) data[k] = v || null;
  }
  if (body.latitude !== undefined) data.latitude = num("latitude");
  if (body.longitude !== undefined) data.longitude = num("longitude");

  const updated = await prisma.studio.update({
    where: { id: studioId },
    data: data as object,
  });
  return NextResponse.json({ studio: updated });
}