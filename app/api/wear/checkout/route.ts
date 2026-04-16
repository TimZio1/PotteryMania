import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { assertRateLimit } from "@/lib/rate-limit";
import { WEAR_CHECKOUT_SHIPPING_COUNTRIES } from "@/lib/wear-shipping";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";
import { logApiError } from "@/lib/monitoring";
import {
  calculateWearMarginCents,
  calculateWearPrice,
  resolveStudioMarginBps,
  resolveWearGlobalPricing,
} from "@/lib/wear-commission";
import { wearPublicProductWhere } from "@/lib/wear-public-filter";

function baseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

type BodyLine = { productId?: unknown; variantId?: unknown; quantity?: unknown };

function lineMergeKey(productId: string, variantId: string | null) {
  return `${productId}::${variantId ?? ""}`;
}

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "wear_checkout", 20, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many checkout attempts" }, { status: 429 });
  }

  let body: {
    items?: BodyLine[];
    customerEmail?: string;
    customerName?: string;
    studioId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : "";
  if (!customerName || !customerEmail) {
    return NextResponse.json({ error: "customerName and customerEmail required" }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const merged = new Map<string, { productId: string; variantId: string | null; quantity: number }>();

  for (const line of rawItems) {
    const productId = typeof line.productId === "string" ? line.productId.trim() : "";
    const vRaw = line.variantId;
    const variantId =
      typeof vRaw === "string" && vRaw.trim().length > 0 ? vRaw.trim() : null;
    const qRaw = line.quantity;
    const q =
      typeof qRaw === "number"
        ? Math.floor(qRaw)
        : typeof qRaw === "string"
          ? parseInt(qRaw, 10)
          : NaN;
    if (!productId || !Number.isFinite(q)) continue;
    const qty = Math.min(99, Math.max(1, q));
    const key = lineMergeKey(productId, variantId);
    const prev = merged.get(key);
    merged.set(key, {
      productId,
      variantId,
      quantity: (prev?.quantity ?? 0) + qty,
    });
  }

  if (merged.size === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const lines = [...merged.values()];
  const productIds = [...new Set(lines.map((l) => l.productId))];

  const products = await prisma.wearProduct.findMany({
    where: {
      ...wearPublicProductWhere(),
      id: { in: productIds },
    },
    include: {
      variants: { where: { isActive: true } },
    },
  });

  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "One or more products are unavailable" }, { status: 400 });
  }

  const productById = new Map(products.map((p) => [p.id, p]));
  const currency = (products[0]?.currency ?? "EUR").toLowerCase();
  for (const p of products) {
    if (p.currency.toLowerCase() !== currency) {
      return NextResponse.json({ error: "Mixed currencies are not supported" }, { status: 400 });
    }
  }

  type Resolved = {
    product: (typeof products)[0];
    variant: (typeof products)[0]["variants"][0] | null;
    quantity: number;
    unitCents: number;
    lineName: string;
  };

  const resolved: Resolved[] = [];

  for (const line of lines) {
    const p = productById.get(line.productId);
    if (!p) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

    const activeVariantCount = p.variants.length;
    let variant: (typeof p.variants)[0] | null = null;

    if (activeVariantCount > 0) {
      if (!line.variantId) {
        return NextResponse.json({ error: "Variant required for one or more items" }, { status: 400 });
      }
      variant = p.variants.find((v) => v.id === line.variantId) ?? null;
      if (!variant) {
        return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
      }
      // POD / print-on-demand: `stockQuantity` null means not tracked (infinite). Only enforce when set.
      if (variant.stockQuantity != null && variant.stockQuantity < line.quantity) {
        return NextResponse.json({ error: `Insufficient stock: ${p.name}` }, { status: 409 });
      }
    } else if (line.variantId) {
      return NextResponse.json({ error: "This product has no variants" }, { status: 400 });
    }

    const unitCents = variant?.priceCents ?? p.priceCents;
    const lineName = variant ? `${p.name} — ${variant.label}` : p.name;

    resolved.push({
      product: p,
      variant,
      quantity: line.quantity,
      unitCents,
      lineName,
    });
  }

  const referringStudioId = typeof body.studioId === "string" ? body.studioId.trim() || null : null;
  let studioMarginBps = 0;
  if (referringStudioId) {
    const wearConfig = await prisma.studioWearConfig.findUnique({
      where: { studioId: referringStudioId },
      select: { enabled: true, marginBps: true },
    });
    if (wearConfig?.enabled) {
      const global = await resolveWearGlobalPricing();
      studioMarginBps = resolveStudioMarginBps(wearConfig.marginBps, global);
      for (const r of resolved) {
        r.unitCents = calculateWearPrice(r.unitCents, studioMarginBps);
      }
    }
  }

  let subtotalCents = 0;
  for (const r of resolved) {
    subtotalCents += r.unitCents * r.quantity;
  }

  let totalStudioMarginCents = 0;
  if (referringStudioId && studioMarginBps > 0) {
    for (const r of resolved) {
      const baseCents = r.variant?.priceCents ?? r.product.priceCents;
      totalStudioMarginCents += calculateWearMarginCents(baseCents, r.unitCents) * r.quantity;
    }
  }
  const platformRevenueCents = subtotalCents - totalStudioMarginCents;

  const orderId = await prisma.$transaction(async (tx) => {
    const order = await tx.wearOrder.create({
      data: {
        studioId: referringStudioId,
        customerEmail,
        customerName,
        status: "pending",
        subtotalCents,
        studioMarginCents: totalStudioMarginCents > 0 ? totalStudioMarginCents : null,
        platformRevenueCents: platformRevenueCents > 0 ? platformRevenueCents : null,
        currency: currency.toUpperCase(),
      },
    });
    for (const r of resolved) {
      await tx.wearOrderItem.create({
        data: {
          orderId: order.id,
          wearProductId: r.product.id,
          wearProductVariantId: r.variant?.id ?? null,
          quantity: r.quantity,
          unitPriceCents: r.unitCents,
          productNameSnapshot: r.lineName,
          variantLabelSnapshot: r.variant?.label ?? null,
        },
      });
    }
    return order.id;
  });

  const stripe = getStripe();
  const line_items = resolved.map((r) => {
    const imgs = wearImageUrlsFromJson(r.product.images);
    const primary = imgs[0];
    const desc = [r.product.subtitle, r.variant?.label].filter(Boolean).join(" · ") || undefined;
    return {
      quantity: r.quantity,
      price_data: {
        currency,
        unit_amount: r.unitCents,
        product_data: {
          name: r.lineName,
          ...(desc ? { description: desc } : {}),
          ...(primary ? { images: [primary] } : {}),
        },
      },
    };
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail,
      line_items,
      phone_number_collection: { enabled: true },
      success_url: `${baseUrl()}/wear/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl()}/wear/cart?cancelled=1`,
      shipping_address_collection: {
        allowed_countries: [...WEAR_CHECKOUT_SHIPPING_COUNTRIES],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 900, currency },
            display_name: "Standard shipping",
          },
        },
      ],
      metadata: {
        type: "wear_order",
        wearOrderId: orderId,
        ...(referringStudioId ? { studioId: referringStudioId } : {}),
      },
      payment_intent_data: {
        metadata: {
          type: "wear_order",
          wearOrderId: orderId,
          ...(referringStudioId ? { studioId: referringStudioId } : {}),
        },
      },
    });

    await prisma.wearOrder.update({
      where: { id: orderId },
      data: { stripeCheckoutSessionId: session.id },
    });

    if (!session.url) {
      await prisma.wearOrder.delete({ where: { id: orderId } });
      return NextResponse.json({ error: "Checkout could not be started" }, { status: 502 });
    }

    return NextResponse.json({ url: session.url, orderId });
  } catch (e) {
    logApiError("wear_checkout", e, { orderId }, req);
    try {
      await prisma.wearOrder.delete({ where: { id: orderId } });
    } catch {
      /* best effort */
    }
    return NextResponse.json({ error: "Payment provider error" }, { status: 502 });
  }
}
