/**
 * Transactional emails sent to apparel customers as their order moves through
 * its lifecycle (Resend). Voice: friendly, direct, branded for PotteryMania.
 * Footer falls through to the default in renderEmailShell, which already
 * points customers at support@potterymania.com.
 */
import { prisma } from "@/lib/db";
import { escapeHtml, renderEmailShell, sendEmailMessages } from "@/lib/email/base";
import { logApiError } from "@/lib/monitoring";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";

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

function shortOrderRef(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function siteOrderTrackingUrl(): string {
  return `${resolvePublicSiteUrl().replace(/\/+$/, "")}/my-orders`;
}

async function sendWearTransactionalEmail(kind: WearOrderNotifyKind, orderId: string): Promise<void> {
  const order = await prisma.wearOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;

  const first = order.customerName.trim().split(/\s+/)[0] || "there";
  const ref = shortOrderRef(order.id);
  const lines = order.items.map(
    (it) =>
      `${it.productNameSnapshot}${it.variantLabelSnapshot ? ` (${it.variantLabelSnapshot})` : ""} × ${it.quantity}`,
  );
  const lineHtml = escapeHtml(lines.join(" · "));
  const totalRaw =
    order.amountTotalCents != null
      ? (order.amountTotalCents / 100).toFixed(2)
      : (order.subtotalCents / 100).toFixed(2);
  const cur = (order.currency || "EUR").toUpperCase();
  const trackingUrl = siteOrderTrackingUrl();

  if (kind === "order_confirmed") {
    await sendEmailMessages([
      {
        to: order.customerEmail,
        subject: `Order confirmed — PotteryMania (#${ref})`,
        html: renderEmailShell({
          eyebrow: `Order #${ref}`,
          title: "Thanks for your order",
          intro: `Hi ${first}, we got your order — it’s in motion. We’ll email you again the moment it ships.`,
          bodyHtml: `<p style="margin:0 0 12px;">${lineHtml}</p><p style="margin:0;"><strong>Total:</strong> ${escapeHtml(totalRaw)} ${escapeHtml(cur)}</p><p style="margin:18px 0 0;font-size:13px;color:#5f5045;">We’ll email you again the moment it’s on the way — most orders move within a few business days.</p>`,
          ctaLabel: "Track my order",
          ctaUrl: trackingUrl,
        }),
      },
    ]);
    return;
  }

  if (kind === "fulfilled") {
    await sendEmailMessages([
      {
        to: order.customerEmail,
        subject: `Your order is being prepared (#${ref})`,
        html: renderEmailShell({
          eyebrow: `Order #${ref}`,
          title: "We're packing it up",
          intro: `Hi ${first}, your order is being prepared for shipping. You'll get a tracking link as soon as it leaves the facility.`,
          bodyHtml: `<p style="margin:0;">${lineHtml}</p>`,
          ctaLabel: "View order",
          ctaUrl: trackingUrl,
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
        subject: `Your order has shipped (#${ref})`,
        html: renderEmailShell({
          eyebrow: `Order #${ref}`,
          title: "Your order is on its way",
          intro: `Hi ${first}, your PotteryMania order has shipped. Here's the rundown.`,
          bodyHtml: `<p style="margin:0;">${lineHtml}</p>${trackBlock}`,
          ctaLabel: "Track my package",
          ctaUrl: trackingUrl,
        }),
      },
    ]);
    return;
  }

  if (kind === "refunded") {
    await sendEmailMessages([
      {
        to: order.customerEmail,
        subject: `Refund processed — PotteryMania (#${ref})`,
        html: renderEmailShell({
          eyebrow: `Order #${ref}`,
          title: "Your refund is on its way",
          intro: `Hi ${first}, a refund has been processed for your order. Most banks post the funds within 5–10 business days.`,
          bodyHtml: `<p style="margin:0;">${lineHtml}</p><p style="margin:18px 0 0;font-size:13px;color:#5f5045;">Questions about this refund? Reply to this email or write to support@potterymania.com.</p>`,
        }),
      },
    ]);
  }
}
