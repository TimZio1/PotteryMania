import { escapeHtml, renderBulletList, renderEmailShell, sendEmailMessages } from "./base";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";

const siteUrl = resolvePublicSiteUrl();

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
      title: "Thanks for your order",
      intro: `Hi ${input.customerName}, ${input.studioName} got your order.`,
      bodyHtml: `${list}<p style="margin:16px 0 8px;">Total: €${escapeHtml(input.totalEur)}</p>${shipping}${tracking}`,
      ctaLabel: "View my orders",
      ctaUrl: `${siteUrl}/my-orders`,
    }),
    vendor: renderEmailShell({
      eyebrow: "New order",
      title: "You have a new order",
      intro: `A new order just came in for ${input.studioName}.`,
      bodyHtml: `${list}<p style="margin:16px 0 0;">Total: €${escapeHtml(input.totalEur)}</p>`,
      ctaLabel: "Open dashboard",
      ctaUrl: `${siteUrl}/dashboard`,
    }),
  };
}

export function abandonedCartCopy(input: { recoveryUrl: string; itemCount: number }) {
  const site = siteUrl;
  const itemLabel = input.itemCount === 1 ? "item" : "items";
  return renderEmailShell({
    eyebrow: "Still in your cart",
    title: "You left something behind",
    intro: `${input.itemCount} ${itemLabel} are still in your cart.`,
    bodyHtml: `<p>Finish your order whenever you're ready.</p><p style="margin-top:20px;font-size:13px;color:#8b7a6d;">You opted in to cart reminders. To stop, sign in at ${escapeHtml(site.replace(/\/+$/, ""))} and turn off marketing email in your account.</p>`,
    ctaLabel: "Finish my order",
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
    ? "Here's your tracking link."
    : "The studio marked your order as shipped.";

  return renderEmailShell({
    eyebrow: "On the way",
    title: "Your order shipped",
    intro: `Hi ${input.customerName}, your order from ${input.studioName} is on its way.`,
    bodyHtml: `<p style="margin:0 0 12px;">${trackingIntro}</p>${carrierLine}${trackingLine}`,
    ctaLabel: input.trackingUrl ? "Track my package" : "View order",
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
    eyebrow: "Payment didn't go through",
    title: "Your payment didn't go through",
    intro: `Hi ${input.customerName}, we couldn't complete payment for your order from ${input.studioName}.`,
    bodyHtml: `<p style="margin:0 0 8px;">Order reference: ${escapeHtml(input.orderId)}</p><p style="margin:0;">Go back to your cart and try again — a different card usually does the trick.</p>`,
    ctaLabel: "Back to cart",
    ctaUrl: `${fallbackUrl.replace(/\/+$/, "")}/cart`,
  });
}
