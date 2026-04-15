import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";
import { allocateGiftCardCode } from "@/lib/gift-cards/code";
import { giftCardEmailCopy, sendGiftCardEmail } from "@/lib/gift-cards/email";
import { logApiError } from "@/lib/monitoring";

type Ctx = { params: Promise<{ studioId: string }> };

function normalizeMoney(raw: unknown) {
  return typeof raw === "number" && Number.isFinite(raw) ? Math.round(raw) : NaN;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const giftCards = await prisma.giftCard.findMany({
    where: { studioId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      template: true,
      redemptions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  return NextResponse.json({ giftCards });
}

export async function POST(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const user = auth.user;

  const studio = await prisma.studio.findUnique({ where: { id: studioId }, select: { id: true, status: true, displayName: true } });
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
  const valueCents = normalizeMoney(body.originalValueCents);
  const recipientName = typeof body.recipientName === "string" ? body.recipientName.trim() : "";
  const recipientEmail = typeof body.recipientEmail === "string" ? body.recipientEmail.trim().toLowerCase() : "";
  const purchaserName = typeof body.purchaserName === "string" ? body.purchaserName.trim() : studio.displayName;
  const purchaserEmail = typeof body.purchaserEmail === "string" ? body.purchaserEmail.trim().toLowerCase() : user.email;
  const validDays =
    typeof body.validDays === "number" && Number.isFinite(body.validDays)
      ? Math.max(1, Math.min(3650, Math.floor(body.validDays)))
      : 365;
  const sendEmail = body.sendEmail !== false;
  const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";

  if (!name || !recipientName || !recipientEmail) {
    return NextResponse.json({ error: "Name and recipient details are required" }, { status: 400 });
  }
  if (!Number.isFinite(valueCents) || valueCents < 100 || valueCents > 100000) {
    return NextResponse.json({ error: "Gift card value must be between €1.00 and €1000.00" }, { status: 400 });
  }

  if (templateId) {
    const template = await prisma.giftCardTemplate.findFirst({
      where: { id: templateId, studioId, isActive: true },
      select: { id: true },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 400 });
    }
  }

  const now = new Date();
  const validUntil = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000);
  const giftCard = await prisma.giftCard.create({
    data: {
      studioId,
      code: await allocateGiftCardCode(prisma),
      name,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      templateId: templateId || null,
      originalValueCents: valueCents,
      remainingValueCents: valueCents,
      currency: "EUR",
      validFrom: now,
      validUntil,
      activatedAt: now,
      purchaserUserId: user.id,
      purchaserName,
      purchaserEmail,
      recipientName,
      recipientEmail,
      personalMessage: typeof body.personalMessage === "string" ? body.personalMessage.trim() || null : null,
      issuedByAdmin: true,
    },
    include: {
      template: true,
      redemptions: true,
    },
  });

  let emailWarning: string | null = null;
  if (sendEmail && giftCard.recipientEmail) {
    try {
      const sentAt = new Date();
      const origin = (process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
      const html = giftCardEmailCopy({
        recipientName: giftCard.recipientName,
        purchaserName: giftCard.purchaserName,
        studioName: studio.displayName,
        code: giftCard.code,
        valueCents: giftCard.originalValueCents,
        validUntil: giftCard.validUntil,
        personalMessage: giftCard.personalMessage,
        balanceUrl: `${origin}/gift-cards/${encodeURIComponent(giftCard.code)}`,
      });
      await sendGiftCardEmail({
        to: giftCard.recipientEmail,
        subject: `Your gift card from ${studio.displayName}`,
        html,
      });
      await prisma.giftCard.update({
        where: { id: giftCard.id },
        data: { sentAt },
      });
      giftCard.sentAt = sentAt;
    } catch (error) {
      logApiError("studio_gift_card_send", error, { giftCardId: giftCard.id, studioId });
      emailWarning = "Gift card created, but email delivery failed. You can still copy the code and send it manually.";
    }
  }

  return NextResponse.json(
    {
      giftCard,
      ...(emailWarning ? { emailWarning } : {}),
    },
    { status: 201 },
  );
}
