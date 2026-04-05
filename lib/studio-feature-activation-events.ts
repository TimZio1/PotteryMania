import type { Prisma, PrismaClient, StudioFeatureActivationEventKind } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

function buildEventData(input: {
  studioId: string;
  featureId: string;
  kind: StudioFeatureActivationEventKind;
  stripeSubscriptionId?: string | null;
  stripeCheckoutSessionId?: string | null;
  payload?: Record<string, unknown>;
}) {
  const payloadJson = input.payload
    ? (JSON.parse(JSON.stringify(input.payload)) as Prisma.InputJsonValue)
    : undefined;
  return {
    studioId: input.studioId,
    featureId: input.featureId,
    kind: input.kind,
    stripeSubscriptionId: input.stripeSubscriptionId?.trim() || null,
    stripeCheckoutSessionId: input.stripeCheckoutSessionId?.trim() || null,
    ...(payloadJson !== undefined ? { payloadJson } : {}),
  };
}

export async function recordStudioFeatureActivationEvent(
  db: Db,
  input: {
    studioId: string;
    featureId: string;
    kind: StudioFeatureActivationEventKind;
    stripeSubscriptionId?: string | null;
    /** When set with `checkout_single` / `checkout_bundle`, upserts on (featureId, session) for Stripe webhook retries. */
    stripeCheckoutSessionId?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  const checkoutSessionId = input.stripeCheckoutSessionId?.trim() || null;
  const isCheckoutKind = input.kind === "checkout_single" || input.kind === "checkout_bundle";

  if (isCheckoutKind && checkoutSessionId) {
    await db.studioFeatureActivationEvent.upsert({
      where: {
        featureId_stripeCheckoutSessionId: {
          featureId: input.featureId,
          stripeCheckoutSessionId: checkoutSessionId,
        },
      },
      create: buildEventData({ ...input, stripeCheckoutSessionId: checkoutSessionId }),
      update: {},
    });
    return;
  }

  await db.studioFeatureActivationEvent.create({
    data: buildEventData(input),
  });
}
