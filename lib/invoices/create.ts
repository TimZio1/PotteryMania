import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function pad(n: number) {
  return String(n).padStart(5, "0");
}

async function nextInvoiceNumber(studioId: string) {
  const year = new Date().getUTCFullYear();
  const prefix = `INV-${studioId.slice(0, 8)}-${year}-`;
  const count = await prisma.invoice.count({
    where: { studioId, invoiceNumber: { startsWith: prefix } },
  });
  return `${prefix}${pad(count + 1)}`;
}

export async function ensureBookingInvoice(bookingId: string) {
  const existing = await prisma.invoice.findFirst({ where: { bookingId } });
  if (existing) return existing;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      experience: { select: { title: true, taxRateBps: true } },
      slot: { select: { slotDate: true, startTime: true } },
      bookingAddOns: { select: { addOnName: true, quantity: true, unitPriceCents: true } },
    },
  });
  if (!booking) return null;

  const taxCents = Math.round((booking.totalAmountCents * booking.experience.taxRateBps) / 10_000);
  const subtotalCents = Math.max(0, booking.totalAmountCents - taxCents);
  const lineItems = [
    {
      type: "booking",
      title: booking.experience.title,
      quantity: booking.participantCount,
      amountCents: booking.totalAmountCents,
      sessionDate: booking.slot.slotDate.toISOString(),
      startTime: booking.slot.startTime,
    },
    ...booking.bookingAddOns.map((addOn) => ({
      type: "add_on",
      title: addOn.addOnName,
      quantity: addOn.quantity,
      amountCents: addOn.quantity * addOn.unitPriceCents,
    })),
  ];

  return prisma.invoice.create({
    data: {
      studioId: booking.studioId,
      invoiceNumber: await nextInvoiceNumber(booking.studioId),
      bookingId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      subtotalCents,
      taxCents,
      totalCents: booking.totalAmountCents,
      currency: "EUR",
      lineItems: lineItems as Prisma.InputJsonValue,
    },
  });
}

export async function ensureOrderInvoice(orderId: string) {
  const existing = await prisma.invoice.findFirst({ where: { orderId } });
  if (existing) return existing;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { title: true } },
          booking: { include: { experience: { select: { title: true } } } },
        },
      },
    },
  });
  if (!order) return null;

  const firstVendor = order.items[0]?.vendorId ?? null;
  if (!firstVendor) return null;

  const lineItems = order.items.map((item) => ({
    type: item.itemType,
    title:
      item.itemType === "product"
        ? item.product?.title ?? "Product"
        : item.booking?.experience.title ?? "Class booking",
    quantity: item.quantity,
    amountCents: item.priceSnapshotCents * item.quantity,
  }));

  return prisma.invoice.create({
    data: {
      studioId: firstVendor,
      invoiceNumber: await nextInvoiceNumber(firstVendor),
      orderId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      subtotalCents: order.subtotalCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      currency: order.currency,
      lineItems: lineItems as Prisma.InputJsonValue,
    },
  });
}
