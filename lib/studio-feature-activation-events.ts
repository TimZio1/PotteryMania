import type { Prisma, PrismaClient, StudioFeatureActivationEventKind } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export async function recordStudioFeatureActivationEvent(
  db: Db,
  input: {
    studioId: string;
    featureId: string;
    kind: StudioFeatureActivationEventKind;
    stripeSubscriptionId?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  const payloadJson = input.payload
    ? (JSON.parse(JSON.stringify(input.payload)) as Prisma.InputJsonValue)
    : undefined;
  await db.studioFeatureActivationEvent.create({
    data: {
      studioId: input.studioId,
      featureId: input.featureId,
      kind: input.kind,
      stripeSubscriptionId: input.stripeSubscriptionId?.trim() || null,
      ...(payloadJson !== undefined ? { payloadJson } : {}),
    },
  });
}
