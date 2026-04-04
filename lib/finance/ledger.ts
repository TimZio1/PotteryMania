import type { FinanceLedgerEntryType, FinanceLedgerDirection, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type LedgerCreateInput = {
  entryDate: Date;
  entryType: FinanceLedgerEntryType;
  amountCents: number;
  currency?: string;
  direction: FinanceLedgerDirection;
  sourceSystem: string;
  sourceType: string;
  sourceId?: string | null;
  dedupeKey: string;
  userId?: string | null;
  studioId?: string | null;
  orderId?: string | null;
  bookingId?: string | null;
  subscriptionId?: string | null;
  planId?: string | null;
  country?: string | null;
  featureKey?: string | null;
  notes?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Idempotent ledger write. Same dedupeKey never creates a duplicate row.
 */
export async function upsertLedgerEntry(input: LedgerCreateInput): Promise<void> {
  const data: Prisma.FinanceLedgerEntryCreateManyInput = {
    entryDate: input.entryDate,
    entryType: input.entryType,
    amountCents: Math.abs(input.amountCents),
    currency: input.currency ?? "EUR",
    direction: input.direction,
    sourceSystem: input.sourceSystem,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    dedupeKey: input.dedupeKey,
    userId: input.userId ?? null,
    studioId: input.studioId ?? null,
    orderId: input.orderId ?? null,
    bookingId: input.bookingId ?? null,
    subscriptionId: input.subscriptionId ?? null,
    planId: input.planId ?? null,
    country: input.country ?? null,
    featureKey: input.featureKey ?? null,
    notes: input.notes ?? null,
  };
  if (input.metadata !== undefined) {
    (data as { metadata?: Prisma.InputJsonValue }).metadata = input.metadata;
  }

  try {
    await prisma.financeLedgerEntry.create({ data });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return;
    }
    throw e;
  }
}
