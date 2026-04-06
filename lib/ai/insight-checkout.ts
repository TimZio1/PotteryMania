import { getStripe } from "@/lib/stripe";

function billingBaseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function createInsightPurchaseCheckout(input: {
  studioId: string;
  insightId: string;
  userId: string;
  previewTitle: string;
  priceCents: number;
}) {
  const stripe = getStripe();
  const { studioId, insightId, userId, previewTitle, priceCents } = input;
  const base = billingBaseUrl();
  const success = `${base}/dashboard/${studioId}/ai?insight_paid=${encodeURIComponent(insightId)}`;
  const cancel = `${base}/dashboard/${studioId}/ai?insight_cancelled=1`;

  return stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: priceCents,
          product_data: {
            name: `Studio insight: ${previewTitle.slice(0, 80)}`,
            description: "One-time unlock of full analysis on PotteryMania.",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "insight_purchase",
      insightId,
      studioId,
      userId,
    },
    success_url: success,
    cancel_url: cancel,
  });
}
