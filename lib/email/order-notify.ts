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
  return renderEmailShell({
    eyebrow: "Cart reminder",
    title: "Your cart is still waiting",
    intro: `You still have ${input.itemCount} item(s) saved in PotteryMania.`,
    bodyHtml: "<p>Return whenever you are ready and complete your order.</p>",
    ctaLabel: "Return to your cart",
    ctaUrl: input.recoveryUrl,
  });
}
