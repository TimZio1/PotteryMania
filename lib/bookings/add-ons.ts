import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

const publicAddOnSelect = {
  id: true,
  name: true,
  description: true,
  imageUrl: true,
  priceCents: true,
  currency: true,
  durationMinutesExtra: true,
  isSelectedByDefault: true,
  maxPerBooking: true,
  sortOrder: true,
} satisfies Prisma.ExperienceAddOnSelect;

export type PublicExperienceAddOn = Prisma.ExperienceAddOnGetPayload<{ select: typeof publicAddOnSelect }>;

export type AddOnSelectionInput = {
  addOnId: string;
  quantity: number;
};

export type AddOnSelectionSnapshot = {
  addOnId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  durationMinutesExtra: number;
};

function normalizeSelectionInput(raw: unknown): {
  ok: true;
  selections: AddOnSelectionInput[];
} | {
  ok: false;
  error: string;
} {
  if (raw == null) {
    return { ok: true, selections: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: "Add-ons payload must be an array" };
  }

  const seen = new Set<string>();
  const selections: AddOnSelectionInput[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, error: "Each add-on selection must be an object" };
    }
    const rec = entry as Record<string, unknown>;
    const addOnId = typeof rec.addOnId === "string" ? rec.addOnId.trim() : "";
    const quantityRaw = typeof rec.quantity === "number" ? Math.floor(rec.quantity) : 1;
    if (!addOnId) {
      return { ok: false, error: "Each add-on selection requires an addOnId" };
    }
    if (seen.has(addOnId)) {
      return { ok: false, error: "Duplicate add-on selections are not allowed" };
    }
    if (!Number.isFinite(quantityRaw) || quantityRaw < 1 || quantityRaw > 99) {
      return { ok: false, error: "Add-on quantity must be between 1 and 99" };
    }
    seen.add(addOnId);
    selections.push({ addOnId, quantity: quantityRaw });
  }

  return { ok: true, selections };
}

export async function getPublicExperienceAddOns(db: DbClient, experienceId: string): Promise<PublicExperienceAddOn[]> {
  return db.experienceAddOn.findMany({
    where: {
      isActive: true,
      experiences: { some: { experienceId } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: publicAddOnSelect,
  });
}

export async function validateAndSnapshotAddOnSelections(
  db: DbClient,
  experienceId: string,
  raw: unknown,
): Promise<
  | {
      ok: true;
      selections: AddOnSelectionSnapshot[];
      totalCents: number;
    }
  | {
      ok: false;
      error: string;
      priceChanged?: boolean;
    }
> {
  const normalized = normalizeSelectionInput(raw);
  if (!normalized.ok) {
    return normalized;
  }
  if (normalized.selections.length === 0) {
    return { ok: true, selections: [], totalCents: 0 };
  }

  const addOns = await getPublicExperienceAddOns(db, experienceId);
  const addOnById = new Map(addOns.map((addOn) => [addOn.id, addOn] as const));

  const selections: AddOnSelectionSnapshot[] = [];
  let totalCents = 0;

  for (const input of normalized.selections) {
    const addOn = addOnById.get(input.addOnId);
    if (!addOn) {
      return {
        ok: false,
        error: "One of the selected add-ons is no longer available for this class. Refresh and try again.",
        priceChanged: true,
      };
    }
    if ((addOn.currency || "EUR").toUpperCase() !== "EUR") {
      return { ok: false, error: `Add-on "${addOn.name}" is not priced in EUR and cannot be booked online yet.` };
    }
    if (input.quantity > Math.max(1, addOn.maxPerBooking)) {
      return { ok: false, error: `Add-on "${addOn.name}" can only be chosen up to ${addOn.maxPerBooking} time(s).` };
    }

    const snapshot: AddOnSelectionSnapshot = {
      addOnId: addOn.id,
      name: addOn.name,
      quantity: input.quantity,
      unitPriceCents: addOn.priceCents,
      durationMinutesExtra: addOn.durationMinutesExtra,
    };
    selections.push(snapshot);
    totalCents += snapshot.unitPriceCents * snapshot.quantity;
  }

  return { ok: true, selections, totalCents };
}

export function coerceAddOnSelectionSnapshots(raw: unknown): AddOnSelectionSnapshot[] {
  if (!Array.isArray(raw)) return [];
  const snapshots: AddOnSelectionSnapshot[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    const addOnId = typeof rec.addOnId === "string" ? rec.addOnId : "";
    const name = typeof rec.name === "string" ? rec.name : "";
    const quantity = typeof rec.quantity === "number" ? Math.floor(rec.quantity) : 0;
    const unitPriceCents = typeof rec.unitPriceCents === "number" ? Math.floor(rec.unitPriceCents) : 0;
    const durationMinutesExtra =
      typeof rec.durationMinutesExtra === "number" ? Math.floor(rec.durationMinutesExtra) : 0;
    if (!addOnId || !name || quantity < 1 || unitPriceCents < 0) continue;
    snapshots.push({
      addOnId,
      name,
      quantity,
      unitPriceCents,
      durationMinutesExtra: Math.max(0, durationMinutesExtra),
    });
  }
  return snapshots;
}

export function addOnSelectionSummary(selections: AddOnSelectionSnapshot[]): string[] {
  return selections.map((selection) =>
    selection.quantity > 1
      ? `${selection.name} x${selection.quantity}`
      : selection.name,
  );
}
