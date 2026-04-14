import { escapeHtml, renderBulletList, renderEmailShell, sendEmailMessages } from "./base";

type SendOpts = {
  customerEmail?: string;
  vendorEmail?: string | null;
  subject: string;
  customerHtml?: string;
  vendorHtml?: string;
}

export async function sendOrderEmails(opts: SendOpts) {
  const messages: { to: string; subject: string; html: string }[] = [];
  if (opts.customerEmail && opts.customerHtml) {
    messages.push({ to: opts.customerEmail, subject: opts.subject, html: opts.customerHtml });
  }
  if (opts.vendorEmail && opts.vendorHtml) {
    messages.push({ to: opts.vendorEmail, subject: `[Studio] ${opts.subject}`, html: opts.vendorHtml });
  }
  await sendEmailMessages(messages);
}

export function orderConfirmationCopy(input: {
  customerName: string;
  studioName: string;
  items: string[];
  totalEur: string;
  shippingMethod?: string | null;
  trackingNumber?: string | null;
}) {
  const list = renderBulletList(input.items);
  const shipping = input.shippingMethod ? `<p style="margin:0 0 8px;">Shipping: ${escapeHtml(input.shippingMethod)}</p>` : "";
  const tracking = input.trackingNumber ? `<p style="margin:0 0 8px;">Tracking: ${escapeHtml(input.trackingNumber)}</p>` : "";
  return {
    customer: renderEmailShell({
      eyebrow: "Order confirmed",
      title: "Your order is confirmed",
      intro: `Hi ${input.customerName}, your PotteryMania order from ${input.studioName} is confirmed.`,
      bodyHtml: `${list}<p style="margin:16px 0 8px;">Total: €${escapeHtml(input.totalEur)}</p>${shipping}${tracking}`,
      ctaLabel: "View PotteryMania",
      ctaUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000",
    }),
    vendor: renderEmailShell({
      eyebrow: "New order",
      title: "A new order has arrived",
      intro: `A new PotteryMania order has been placed for ${input.studioName}.`,
      bodyHtml: `${list}<p style="margin:16px 0 0;">Total charged: €${escapeHtml(input.totalEur)}</p>`,
      ctaLabel: "Open dashboard",
      ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000"}/dashboard`,
    }),
  };
}

export function abandonedCartCopy(input: { recoveryUrl: string; itemCount: number }) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "https://potterymania.com";
  return renderEmailShell({
    eyebrow: "Cart reminder",
    title: "Your cart is still waiting",
    intro: `You still have ${input.itemCount} item(s) saved in PotteryMania.`,
    bodyHtml: `<p>Return whenever you are ready and complete your order.</p><p style="margin-top:20px;font-size:13px;color:#8b7a6d;">You received this because you opted in to cart reminders. To opt out, sign in at ${escapeHtml(site.replace(/\/+$/, ""))} and disable marketing email in your account (or contact support).</p>`,
    ctaLabel: "Return to your cart",
    ctaUrl: input.recoveryUrl,
  });
}

export function orderShippedCopy(input: {
  customerName: string;
  studioName: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  trackingCarrier?: string | null;
}) {
  const trackingLine = input.trackingNumber
    ? `<p style="margin:0 0 8px;">Tracking number: ${escapeHtml(input.trackingNumber)}</p>`
    : "";
  const carrierLine = input.trackingCarrier
    ? `<p style="margin:0 0 8px;">Carrier: ${escapeHtml(input.trackingCarrier)}</p>`
    : "";
  const trackingIntro = input.trackingUrl
    ? "Your studio shared a tracking link for this shipment."
    : "Your studio marked the order as shipped.";

  return renderEmailShell({
    eyebrow: "Order update",
    title: "Your order is on the way",
    intro: `Hi ${input.customerName}, your order from ${input.studioName} has shipped.`,
    bodyHtml: `<p style="margin:0 0 12px;">${trackingIntro}</p>${carrierLine}${trackingLine}`,
    ctaLabel: input.trackingUrl ? "Track shipment" : "Open PotteryMania",
    ctaUrl:
      input.trackingUrl ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.AUTH_URL ||
      "http://localhost:3000",
  });
}

export function orderPaymentFailedCopy(input: {
  customerName: string;
  orderId: string;
  studioName: string;
}) {
  const fallbackUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000";
  return renderEmailShell({
    eyebrow: "Payment issue",
    title: "We could not complete your payment",
    intro: `Hi ${input.customerName}, we could not complete payment for your order from ${input.studioName}.`,
    bodyHtml: `<p style="margin:0 0 8px;">Order reference: ${escapeHtml(input.orderId)}</p><p style="margin:0;">Please return to checkout and try again with another card if needed.</p>`,
    ctaLabel: "Open cart",
    ctaUrl: `${fallbackUrl.replace(/\/+$/, "")}/cart`,
  });
}
