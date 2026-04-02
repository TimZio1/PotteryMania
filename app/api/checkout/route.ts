import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { getCartForRequest, cartItemInclude } from "@/lib/cart-server";
import { resolveCommissionBps, commissionCentsFromLine } from "@/lib/commission";
import { getStripe } from "@/lib/stripe";
import type { Prisma } from "@prisma/client";

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

  const productBps = await resolveCommissionBps(studioId, "product");
  const bookingBps = await resolveCommissionBps(studioId, "booking");

  let subtotal = 0;
  let commissionTotal = 0;
  const lineRows: {
    itemType: "product" | "booking";
    title: string;
    quantity: number;
    productId?: string;
    experienceId?: string;
    slotId?: string;
    participantCount?: number;
    policySnapshot?: Prisma.InputJsonValue;
    unitCents: number;
    lineCents: number;
    commissionCents: number;
    vendorCents: number;
  }[] = [];

  for (const item of cart.items) {
    if (item.itemType === "product") {
      if (!item.productId || !item.product) {
        return NextResponse.json({ error: "Invalid cart item" }, { status: 400 });
      }
      const p = item.product;
      if (p.status !== "active" || p.studio.status !== "approved") {
        return NextResponse.json({ error: `Product unavailable: ${p.title}` }, { status: 400 });
      }
      const unit = item.priceSnapshotCents;
      const lineCents = unit * item.quantity;
      const com = commissionCentsFromLine(lineCents, productBps);
      subtotal += lineCents;
      commissionTotal += com;
      lineRows.push({
        itemType: "product",
        productId: p.id,
        title: p.title,
        quantity: item.quantity,
        unitCents: unit,
        lineCents,
        commissionCents: com,
        vendorCents: lineCents - com,
      });
      continue;
    }

    if (!item.experienceId || !item.slotId || !item.experience || !item.slot || !item.participantCount) {
      return NextResponse.json({ error: "Invalid booking cart item" }, { status: 400 });
    }

    const experience = item.experience;
    const slot = item.slot;
    if (experience.status !== "active" || experience.visibility !== "public" || experience.studio.status !== "approved") {
      return NextResponse.json({ error: `Experience unavailable: ${experience.title}` }, { status: 400 });
    }
    if (slot.status !== "open") {
      return NextResponse.json({ error: `Slot no longer bookable: ${experience.title}` }, { status: 400 });
    }
    if (
      item.participantCount < experience.minimumParticipants ||
      item.participantCount > experience.maximumParticipants
    ) {
      return NextResponse.json({ error: `Invalid participant count: ${experience.title}` }, { status: 400 });
    }
    if (item.participantCount > slot.capacityTotal - slot.capacityReserved) {
      return NextResponse.json({ error: `Not enough capacity: ${experience.title}` }, { status: 400 });
    }

    const unit = item.priceSnapshotCents;
    const lineCents = unit * item.participantCount;
    const com = commissionCentsFromLine(lineCents, bookingBps);
    subtotal += lineCents;
    commissionTotal += com;
    lineRows.push({
      itemType: "booking",
      experienceId: experience.id,
      slotId: slot.id,
      title: `${experience.title} (per person)`,
      quantity: item.participantCount,
      participantCount: item.participantCount,
      unitCents: unit,
      lineCents,
      commissionCents: com,
      vendorCents: lineCents - com,
      policySnapshot: (item.policySnapshot as Prisma.InputJsonValue | null) ?? undefined,
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

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
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
      },
    });

    for (const row of lineRows) {
      if (row.itemType === "product" && row.productId) {
        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            itemType: "product",
            productId: row.productId,
            vendorId: studioId,
            quantity: row.quantity,
            priceSnapshotCents: row.lineCents,
            commissionSnapshotCents: row.commissionCents,
            vendorAmountSnapshotCents: row.vendorCents,
          },
        });
        continue;
      }

      if (row.itemType === "booking" && row.experienceId && row.slotId && row.participantCount) {
        // Pending bookings are finalized by Stripe webhook confirmation.
        // Add a scheduled expiry job before relying on long-lived pending rows.
        const booking = await tx.booking.create({
          data: {
            studioId,
            experienceId: row.experienceId,
            slotId: row.slotId,
            customerUserId: user?.id ?? null,
            customerName,
            customerEmail,
            customerPhone: body.customerPhone?.trim() || null,
            participantCount: row.participantCount,
            bookingStatus: "pending",
            paymentStatus: "pending",
            totalAmountCents: row.lineCents,
            commissionAmountCents: row.commissionCents,
            vendorAmountCents: row.vendorCents,
            cancellationPolicySnapshot: row.policySnapshot,
            notes: body.notes?.trim() || null,
          },
        });

        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            itemType: "booking",
            bookingId: booking.id,
            vendorId: studioId,
            quantity: 1,
            participantCount: row.participantCount,
            priceSnapshotCents: row.lineCents,
            commissionSnapshotCents: row.commissionCents,
            vendorAmountSnapshotCents: row.vendorCents,
          },
        });
      }
    }

    return createdOrder;
  });

  const stripe = getStripe();
  const line_items = lineRows.map((r) => ({
    quantity: r.quantity,
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