/**
 * Transactional email when wear orders move through lifecycle (Resend).
 */
import { prisma } from "@/lib/db";
import { escapeHtml, renderEmailShell, sendEmailMessages } from "@/lib/email/base";
import { logApiError } from "@/lib/monitoring";

export type WearOrderNotifyKind = "order_confirmed" | "fulfilled" | "shipped" | "refunded";

export function scheduleWearOrderNotification(
  kind: WearOrderNotifyKind,
  orderId: string,
  context?: Record<string, unknown>,
): void {
  void context;
  void sendWearTransactionalEmail(kind, orderId).catch((e) =>
    logApiError("wear_order_email", e, { kind, orderId }),
  );
}

async function sendWearTransactionalEmail(kind: WearOrderNotifyKind, orderId: string): Promise<void> {
  const order = await prisma.wearOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;

  const first = order.customerName.trim().split(/\s+/)[0] || "there";
  const lines = order.items.map(
    (it) =>
      `${it.productNameSnapshot}${it.variantLabelSnapshot ? ` (${it.variantLabelSnapshot})` : ""} × ${it.quantity}`,
  );
  const lineHtml = escapeHtml(lines.join(" · "));
  const total =
    order.amountTotalCents != null
      ? (order.amountTotalCents / 100).toFixed(2)
      : (order.subtotalCents / 100).toFixed(2);
  const cur = (order.currency || "EUR").toUpperCase();

  if (kind === "order_confirmed") {
    await sendEmailMessages([
      {
        to: order.customerEmail,
        subject: "Your PotteryMania shop order is confirmed",
        html: renderEmailShell({
          eyebrow: "Thank you",
          title: "Order confirmed",
          intro: `Hi ${first}, we've received your order and will prepare it for fulfilment.`,
          bodyHtml: `<p style="margin:0 0 12px;">${lineHtml}</p><p style="margin:0;"><strong>Total:</strong> ${escapeHtml(total)} ${escapeHtml(cur)}</p>`,
          footerNote: "PotteryMania shop — ceramic community merch.",
        }),
      },
    ]);
    return;
  }

  if (kind === "fulfilled") {
    await sendEmailMessages([
      {
        to: order.customerEmail,
        subject: "Your merch order is being prepared",
        html: renderEmailShell({
          eyebrow: "Update",
          title: "Order fulfilled — shipping soon",
          intro: `Hi ${first}, your items are packed and will ship shortly.`,
          bodyHtml: `<p style="margin:0;">${lineHtml}</p>`,
          footerNote: "PotteryMania shop — ceramic community merch.",
        }),
      },
    ]);
    return;
  }

  if (kind === "shipped") {
    const tr = order.trackingNumber?.trim();
    const trackBlock = tr
      ? `<p style="margin:16px 0 0;"><strong>Tracking:</strong> ${escapeHtml(tr)}</p>`
      : "";
    await sendEmailMessages([
      {
        to: order.customerEmail,
        subject: "Your PotteryMania shop order has shipped",
        html: renderEmailShell({
          eyebrow: "Shipped",
          title: "On its way",
          intro: `Hi ${first}, your order is on its way.`,
          bodyHtml: `<p style="margin:0;">${lineHtml}</p>${trackBlock}`,
          footerNote: "PotteryMania shop — ceramic community merch.",
        }),
      },
    ]);
    return;
  }

  if (kind === "refunded") {
    await sendEmailMessages([
      {
        to: order.customerEmail,
        subject: "Your PotteryMania shop order — refund processed",
        html: renderEmailShell({
          eyebrow: "Refund",
          title: "Refund issued",
          intro: `Hi ${first}, a refund has been processed for your order. It may take a few days to appear on your statement.`,
          bodyHtml: `<p style="margin:0;">${lineHtml}</p>`,
          footerNote: "PotteryMania shop — ceramic community merch.",
        }),
      },
    ]);
  }
}
