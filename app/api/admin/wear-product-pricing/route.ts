import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

type PricingRow = {
  productId: string;
  /** Omitted for Spreadconnect-linked products — wholesale stays from sync. */
  supplyCostCents?: number | null;
  internalMarkupPercent: number | null;
};

function parseMarkup(raw: unknown): number | null {
  if (raw === null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number(raw.trim().replace(",", "."));
    if (!Number.isFinite(n)) return null;
    return n;
  }
  return null;
}

function parseSupplyCents(raw: unknown): number | null {
  if (raw === null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.round(raw));
  if (typeof raw === "string") {
    const n = Number(raw.trim().replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100);
  }
  return null;
}

export async function GET() {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.wearProduct.findMany({
    where: { archivedAt: null },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      supplyCostCents: true,
      internalMarkupPercent: true,
    },
  });

  return NextResponse.json({ rows });
}

export async function PATCH(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { updates?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updatesRaw = body.updates;
  if (!Array.isArray(updatesRaw) || updatesRaw.length === 0) {
    return NextResponse.json({ error: "updates array required" }, { status: 400 });
  }

  const updates: PricingRow[] = [];
  for (const item of updatesRaw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const productId = typeof o.productId === "string" ? o.productId.trim() : "";
    if (!productId) continue;
    const hasSupplyKey = Object.prototype.hasOwnProperty.call(o, "supplyCostCents");
    updates.push({
      productId,
      ...(hasSupplyKey ? { supplyCostCents: parseSupplyCents(o.supplyCostCents) } : {}),
      internalMarkupPercent: parseMarkup(o.internalMarkupPercent),
    });
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No valid updates" }, { status: 400 });
  }

  const existing = await prisma.wearProduct.findMany({
    where: { id: { in: updates.map((u) => u.productId) } },
    select: { id: true, spreadconnectArticleId: true, externalFulfillmentId: true },
  });
  const byId = new Map(existing.map((e) => [e.id, e]));
  const filtered = updates.filter((u) => byId.has(u.productId));
  if (filtered.length === 0) {
    return NextResponse.json({ error: "No matching products" }, { status: 400 });
  }

  try {
    await prisma.$transaction(
      filtered.map((u) => {
        const row = byId.get(u.productId)!;
        const scLinked = Boolean(row.spreadconnectArticleId || row.externalFulfillmentId);
        return prisma.wearProduct.update({
          where: { id: u.productId },
          data: {
            ...(scLinked ? {} : { supplyCostCents: u.supplyCostCents ?? null }),
            internalMarkupPercent: u.internalMarkupPercent,
          },
        });
      }),
    );

    await logAdminAction({
      actorUserId: user.id,
      action: "wear_product.pricing_batch",
      entityType: "wear_product",
      entityId: null,
      after: { count: filtered.length },
    });

    return NextResponse.json({ ok: true, updated: filtered.length });
  } catch (e: unknown) {
    logApiError("admin_wear_product_pricing_patch", e, { count: filtered.length }, req);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
