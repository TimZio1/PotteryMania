import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { getStripe } from "@/lib/stripe";
import { assertRateLimit } from "@/lib/rate-limit";
import { logApiError } from "@/lib/monitoring";
import { allocateGiftCardCode } from "@/lib/gift-cards/code";

function baseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "gift_cards_purchase", 15, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many gift card purchase attempts" }, { status: 429 });
  }

  let body: {
    studioId?: string;
    amountCents?: number;
    name?: string;
    description?: string | null;
    templateId?: string | null;
    purchaserName?: string;
    purchaserEmail?: string;
    recipientName?: string;
    recipientEmail?: string;
    personalMessage?: string;
    validDays?: number;
  };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("gift_cards_purchase_invalid_json", e, undefined, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const studioId = typeof body.studioId === "string" ? body.studioId.trim() : "";
  const purchaserName = typeof body.purchaserName === "string" ? body.purchaserName.trim() : "";
  const purchaserEmail = typeof body.purchaserEmail === "string" ? body.purchaserEmail.trim().toLowerCase() : "";
  const recipientName = typeof body.recipientName === "string" ? body.recipientName.trim() : "";
  const recipientEmail = typeof body.recipientEmail === "string" ? body.recipientEmail.trim().toLowerCase() : "";
  const giftName = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() || null : null;
  const personalMessage = typeof body.personalMessage === "string" ? body.personalMessage.trim() || null : null;
  const amountCents = typeof body.amountCents === "number" ? Math.round(body.amountCents) : NaN;
  const validDays =
    typeof body.validDays === "number" && Number.isFinite(body.validDays)
      ? Math.max(1, Math.min(3650, Math.floor(body.validDays)))
      : 365;

  if (!studioId || !purchaserName || !purchaserEmail || !recipientName || !recipientEmail || !giftName) {
    return NextResponse.json({ error: "studioId, purchaser, recipient, and name are required" }, { status: 400 });
  }
  if (!Number.isFinite(amountCents) || amountCents < 500 || amountCents > 100000) {
    return NextResponse.json({ error: "Gift card amount must be between €5.00 and €1000.00" }, { status: 400 });
  }

  const studio = await prisma.studio.findFirst({
    where: {
      id: studioId,
      status: "approved",
      stripeAccount: { is: { chargesEnabled: true, payoutsEnabled: true } },
    },
    include: {
      stripeAccount: true,
    },
  });
  if (!studio || !studio.stripeAccount) {
    return NextResponse.json({ error: "Studio is not available for gift card purchases" }, { status: 404 });
  }

  const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
  const template = templateId
    ? await prisma.giftCardTemplate.findFirst({
        where: { id: templateId, studioId, isActive: true },
        select: { id: true },
      })
    : null;
  if (templateId && !template) {
    return NextResponse.json({ error: "Selected gift card template is unavailable" }, { status: 400 });
  }

  const user = await getSessionUser();
  const now = new Date();
  const validUntil = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000);
  const code = await allocateGiftCardCode(prisma);

  const giftCard = await prisma.giftCard.create({
    data: {
      studioId,
      code,
      name: giftName,
      description,
      templateId: template?.id ?? null,
      originalValueCents: amountCents,
      remainingValueCents: amountCents,
      currency: "EUR",
      validFrom: now,
      validUntil,
      purchaserUserId: user?.id ?? null,
      purchaserName,
      purchaserEmail,
      recipientName,
      recipientEmail,
      personalMessage,
      issuedByAdmin: false,
      isActive: true,
    },
  });

  try {
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        customer_email: purchaserEmail,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: amountCents,
              product_data: {
                name: `${studio.displayName} gift card`,
                description: `${giftName} for ${recipientName}`,
              },
            },
          },
        ],
        success_url: `${baseUrl()}/gift-cards/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl()}/gift-cards?cancelled=1`,
        metadata: {
          type: "gift_card_purchase",
          giftCardId: giftCard.id,
          studioId,
          code,
        },
        payment_intent_data: {
          metadata: {
            type: "gift_card_purchase",
            giftCardId: giftCard.id,
            studioId,
            code,
          },
        },
      },
      { stripeAccount: studio.stripeAccount.stripeAccountId },
    );

    await prisma.giftCard.update({
      where: { id: giftCard.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    if (!session.url) {
      await prisma.giftCard.delete({ where: { id: giftCard.id } });
      return NextResponse.json({ error: "Checkout could not be started" }, { status: 502 });
    }

    return NextResponse.json({
      checkoutUrl: session.url,
      giftCardId: giftCard.id,
    });
  } catch (e) {
    logApiError("gift_cards_purchase_checkout", e, { giftCardId: giftCard.id, studioId }, req);
    try {
      await prisma.giftCard.delete({ where: { id: giftCard.id } });
    } catch {
      // best effort cleanup
    }
    return NextResponse.json({ error: "Payment provider error" }, { status: 502 });
  }
}
