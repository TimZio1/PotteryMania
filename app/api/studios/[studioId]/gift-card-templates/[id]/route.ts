import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";
import { normalizeGiftCardImageUrl, normalizeHexColor } from "@/lib/gift-cards/theme";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { status: true },
  });
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  const existing = await prisma.giftCardTemplate.findFirst({
    where: { id, studioId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    name?: string;
    imageUrl?: string | null;
    bgColor?: string | null;
    textColor?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
  } = {};

  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Template name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if ("imageUrl" in body) {
    if (body.imageUrl == null || body.imageUrl === "") {
      data.imageUrl = null;
    } else {
      const imageUrl = normalizeGiftCardImageUrl(body.imageUrl);
      if (!imageUrl) {
        return NextResponse.json({ error: "Template image URL must be a valid http(s) URL" }, { status: 400 });
      }
      data.imageUrl = imageUrl;
    }
  }
  if ("bgColor" in body) {
    if (body.bgColor == null || body.bgColor === "") {
      data.bgColor = null;
    } else {
      const bgColor = normalizeHexColor(body.bgColor);
      if (!bgColor) {
        return NextResponse.json({ error: "Background color must be a valid hex color" }, { status: 400 });
      }
      data.bgColor = bgColor;
    }
  }
  if ("textColor" in body) {
    if (body.textColor == null || body.textColor === "") {
      data.textColor = null;
    } else {
      const textColor = normalizeHexColor(body.textColor);
      if (!textColor) {
        return NextResponse.json({ error: "Text color must be a valid hex color" }, { status: 400 });
      }
      data.textColor = textColor;
    }
  }
  if ("isActive" in body) {
    data.isActive = body.isActive === true;
  }
  if ("isDefault" in body) {
    data.isDefault = body.isDefault === true;
  }

  const template = await prisma.$transaction(async (tx) => {
    if (data.isDefault === true) {
      await tx.giftCardTemplate.updateMany({
        where: { studioId, id: { not: id } },
        data: { isDefault: false },
      });
    }
    return tx.giftCardTemplate.update({
      where: { id },
      data,
    });
  });

  return NextResponse.json({ template });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.giftCardTemplate.findFirst({
    where: { id, studioId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.giftCardTemplate.delete({
    where: { id },
  });
  return NextResponse.json({ ok: true });
}
