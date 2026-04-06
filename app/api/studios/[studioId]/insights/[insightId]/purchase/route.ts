import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { createInsightPurchaseCheckout } from "@/lib/ai/insight-checkout";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string; insightId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { studioId, insightId } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  }

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const insight = await prisma.generatedInsight.findFirst({
    where: {
      id: insightId,
      studioId,
      status: { in: ["generated", "viewed"] },
    },
  });
  if (!insight) {
    return NextResponse.json({ error: "Insight not available for purchase." }, { status: 400 });
  }

  if (insight.priceCents < 50) {
    return NextResponse.json({ error: "Invalid price." }, { status: 400 });
  }

  try {
    const session = await createInsightPurchaseCheckout({
      studioId,
      insightId: insight.id,
      userId: user.id,
      previewTitle: insight.previewTitle,
      priceCents: insight.priceCents,
    });
    if (!session.url) {
      return NextResponse.json({ error: "Checkout could not be created." }, { status: 500 });
    }
    return NextResponse.json({ checkoutUrl: session.url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Checkout failed." }, { status: 500 });
  }
}
