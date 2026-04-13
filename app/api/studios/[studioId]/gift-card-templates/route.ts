import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { normalizeGiftCardImageUrl, normalizeHexColor } from "@/lib/gift-cards/theme";

type Ctx = { params: Promise<{ studioId: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true, status: true },
  });
  if (!studio || studio.ownerUserId !== userId) return null;
  return studio;
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const templates = await prisma.giftCardTemplate.findMany({
    where: { studioId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ templates });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Template name is required" }, { status: 400 });

  const isDefault = body.isDefault === true;
  const imageUrl = normalizeGiftCardImageUrl(body.imageUrl);
  const bgColor = normalizeHexColor(body.bgColor);
  const textColor = normalizeHexColor(body.textColor);

  if ("imageUrl" in body && body.imageUrl != null && !imageUrl) {
    return NextResponse.json({ error: "Template image URL must be a valid http(s) URL" }, { status: 400 });
  }
  if ("bgColor" in body && body.bgColor != null && !bgColor) {
    return NextResponse.json({ error: "Background color must be a valid hex color" }, { status: 400 });
  }
  if ("textColor" in body && body.textColor != null && !textColor) {
    return NextResponse.json({ error: "Text color must be a valid hex color" }, { status: 400 });
  }

  const template = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.giftCardTemplate.updateMany({
        where: { studioId },
        data: { isDefault: false },
      });
    }
    return tx.giftCardTemplate.create({
      data: {
        studioId,
        name,
        imageUrl,
        bgColor,
        textColor,
        isDefault,
        isActive: body.isActive !== false,
      },
    });
  });

  return NextResponse.json({ template }, { status: 201 });
}
