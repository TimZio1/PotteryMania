import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { getCartForRequest, cartItemInclude } from "@/lib/cart-server";
import { resolveCommissionBps, commissionCentsFromLine } from "@/lib/commission";
import { getStripe } from "@/lib/stripe";

function baseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const { cartId } = await getCartForRequest(user?.id ?? null);

  let body: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    shippingAddress?: { line1?: string; line2?: string; city?: string; country?: string; postal?: string };
    billingAddress?: Record<string, unknown>;
    notes?: string;
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

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: { include: cartItemInclude } },
  });
  if (!cart?.items.length) {
    return NextResponse.json({ error: "Cart empty" }, { status: 400 });
  }

  const studioId = cart.items[0].vendorId;
  if (cart.items.some((i) => i.vendorId !== studioId)) {
    return NextResponse.json({ error: "Mixed vendors" }, { status: 400 });
  }

  const stripeRow = await prisma.stripeAccount.findUnique({ where: { studioId } });
  if (!stripeRow?.chargesEnabled || !stripeRow.payoutsEnabled) {
    return NextResponse.json({ error: "Studio has not completed Stripe Connect" }, { status: 400 });
  }

  const bps = await resolveCommissionBps(studioId, "product");

  let subtotal = 0;
  let commissionTotal = 0;
  const lineRows: {
    productId: string;
    title: string;
    qty: number;
    unitCents: number;
    lineCents: number;
    commissionCents: number;
    vendorCents: number;
  }[] = [];

  for (const item of cart.items) {
    if (item.itemType !== "product" || !item.productId || !item.product) {
      return NextResponse.json({ error: "Invalid cart item" }, { status: 400 });
    }
    const p = item.product;
    if (p.status !== "active" || p.studio.status !== "approved") {
      return NextResponse.json({ error: `Product unavailable: ${p.title}` }, { status: 400 });
    }
    const unit = item.priceSnapshotCents;
    const lineCents = unit * item.quantity;
    const com = commissionCentsFromLine(lineCents, bps);
    subtotal += lineCents;
    commissionTotal += com;
    lineRows.push({
      productId: p.id,
      title: p.title,
      qty: item.quantity,
      unitCents: unit,
      lineCents,
      commissionCents: com,
      vendorCents: lineCents - com,
    });
  }

  const shipping = body.shippingAddress || {};
  const shippingAddressJson = {
    line1: shipping.line1 || "",
    line2: shipping.line2 || "",
    city: shipping.city || "",
    country: shipping.country || "",
    postal: shipping.postal || "",
  };

  const order = await prisma.order.create({
    data: {
      customerUserId: user?.id ?? null,
      customerName,
      customerEmail,
      customerPhone: body.customerPhone?.trim() || null,
      shippingAddressJson,
      billingAddressJson: body.billingAddress ? (body.billingAddress as object) : undefined,
      notes: body.notes?.trim() || null,
      orderStatus: "pending",
      paymentStatus: "pending",
      subtotalCents: subtotal,
      totalCents: subtotal,
      currency: "EUR",
      items: {
        create: lineRows.map((r) => ({
          itemType: "product" as const,
          productId: r.productId,
          vendorId: studioId,
          quantity: r.qty,
          priceSnapshotCents: r.lineCents,
          commissionSnapshotCents: r.commissionCents,
          vendorAmountSnapshotCents: r.vendorCents,
        })),
      },
    },
  });

  const stripe = getStripe();
  const line_items = lineRows.map((r) => ({
    quantity: r.qty,
    price_data: {
      currency: "eur",
      unit_amount: r.unitCents,
      product_data: { name: r.title },
    },
  }));

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: customerEmail,
      line_items,
      success_url: `${baseUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl()}/cart?cancelled=1`,
      payment_intent_data: {
        application_fee_amount: commissionTotal,
        transfer_data: { destination: stripeRow.stripeAccountId },
        metadata: { orderId: order.id },
      },
      metadata: { orderId: order.id, cartId },
    }
  );

  return NextResponse.json({ url: session.url, orderId: order.id });
}