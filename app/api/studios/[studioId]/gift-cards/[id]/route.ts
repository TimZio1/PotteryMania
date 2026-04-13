import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true, status: true },
  });
  if (!studio || studio.ownerUserId !== userId) return null;
  return studio;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId, id } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  const existing = await prisma.giftCard.findFirst({
    where: { id, studioId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    name?: string;
    description?: string | null;
    recipientName?: string | null;
    recipientEmail?: string | null;
    personalMessage?: string | null;
    validUntil?: Date | null;
    isActive?: boolean;
    templateId?: string | null;
  } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if ("description" in body) {
    data.description = typeof body.description === "string" ? body.description.trim() || null : null;
  }
  if ("recipientName" in body) {
    data.recipientName = typeof body.recipientName === "string" ? body.recipientName.trim() || null : null;
  }
  if ("recipientEmail" in body) {
    data.recipientEmail = typeof body.recipientEmail === "string" ? body.recipientEmail.trim().toLowerCase() || null : null;
  }
  if ("personalMessage" in body) {
    data.personalMessage = typeof body.personalMessage === "string" ? body.personalMessage.trim() || null : null;
  }
  if ("isActive" in body) {
    data.isActive = body.isActive === true;
  }
  if ("templateId" in body) {
    const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
    if (templateId) {
      const template = await prisma.giftCardTemplate.findFirst({
        where: { id: templateId, studioId },
        select: { id: true },
      });
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 400 });
      }
      data.templateId = template.id;
    } else {
      data.templateId = null;
    }
  }
  if ("validUntil" in body) {
    const validUntil = typeof body.validUntil === "string" ? new Date(body.validUntil) : null;
    if (validUntil && Number.isNaN(validUntil.getTime())) {
      return NextResponse.json({ error: "Invalid validUntil date" }, { status: 400 });
    }
    data.validUntil = validUntil;
  }

  const giftCard = await prisma.giftCard.update({
    where: { id },
    data,
    include: {
      template: true,
      redemptions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json({ giftCard });
}
