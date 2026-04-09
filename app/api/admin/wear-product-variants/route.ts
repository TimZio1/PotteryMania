import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    wearProductId?: string;
    label?: string;
    sku?: string | null;
    optionSize?: string | null;
    optionColor?: string | null;
    priceCents?: number | null;
    stockQuantity?: number | null;
    sortOrder?: number;
    isActive?: boolean;
  };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_wear_product_variants_post_invalid_json", e, undefined, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const wearProductId = typeof body.wearProductId === "string" ? body.wearProductId.trim() : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!wearProductId || !label) {
    return NextResponse.json({ error: "wearProductId and label required" }, { status: 400 });
  }

  const parent = await prisma.wearProduct.findUnique({ where: { id: wearProductId } });
  if (!parent) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const priceCents =
    body.priceCents == null
      ? null
      : typeof body.priceCents === "number" && Number.isFinite(body.priceCents)
        ? Math.max(0, Math.floor(body.priceCents))
        : null;

  const stockQuantity =
    body.stockQuantity === null || body.stockQuantity === undefined
      ? null
      : typeof body.stockQuantity === "number" && Number.isFinite(body.stockQuantity)
        ? Math.max(0, Math.floor(body.stockQuantity))
        : null;

  const created = await prisma.wearProductVariant.create({
    data: {
      wearProductId,
      label,
      sku: typeof body.sku === "string" ? body.sku.trim() || null : null,
      optionSize: typeof body.optionSize === "string" ? body.optionSize.trim() || null : null,
      optionColor: typeof body.optionColor === "string" ? body.optionColor.trim() || null : null,
      priceCents,
      stockQuantity,
      sortOrder:
        typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
          ? Math.floor(body.sortOrder)
          : 0,
      isActive: body.isActive !== false,
    },
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "wear_product_variant.create",
    entityType: "wear_product_variant",
    entityId: created.id,
    after: { label: created.label, wearProductId },
  });

  return NextResponse.json({ id: created.id });
}
