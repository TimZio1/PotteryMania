import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string; productId: string }> };

async function assertProductOwnership(studioId: string, productId: string, userId: string) {
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== userId) return false;
  const product = await prisma.product.findFirst({ where: { id: productId, studioId }, select: { id: true } });
  return Boolean(product);
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, productId } = await ctx.params;
  const ok = await assertProductOwnership(studioId, productId, user.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const translations = await prisma.productTranslation.findMany({
    where: { productId },
    orderBy: { languageCode: "asc" },
  });
  return NextResponse.json({ translations });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, productId } = await ctx.params;
  const ok = await assertProductOwnership(studioId, productId, user.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    languageCode?: string;
    title?: string;
    shortDescription?: string | null;
    fullDescription?: string | null;
    materials?: string | null;
    careInstructions?: string | null;
    shippingNotes?: string | null;
    returnNotes?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const languageCode = typeof body.languageCode === "string" ? body.languageCode.trim().toLowerCase() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!languageCode || !/^[a-z]{2}(-[a-z0-9]{2,8})?$/.test(languageCode)) {
    return NextResponse.json({ error: "Invalid languageCode." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "title required." }, { status: 400 });
  }

  const translation = await prisma.productTranslation.upsert({
    where: { productId_languageCode: { productId, languageCode } },
    create: {
      productId,
      languageCode,
      title,
      shortDescription: body.shortDescription?.trim() || null,
      fullDescription: body.fullDescription?.trim() || null,
      materials: body.materials?.trim() || null,
      careInstructions: body.careInstructions?.trim() || null,
      shippingNotes: body.shippingNotes?.trim() || null,
      returnNotes: body.returnNotes?.trim() || null,
    },
    update: {
      title,
      shortDescription: body.shortDescription?.trim() || null,
      fullDescription: body.fullDescription?.trim() || null,
      materials: body.materials?.trim() || null,
      careInstructions: body.careInstructions?.trim() || null,
      shippingNotes: body.shippingNotes?.trim() || null,
      returnNotes: body.returnNotes?.trim() || null,
    },
  });
  return NextResponse.json({ translation });
}
