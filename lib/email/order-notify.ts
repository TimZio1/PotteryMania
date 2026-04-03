import { Resend } from "resend";

type SendOpts = {
  customerEmail?: string;
  vendorEmail?: string | null;
  subject: string;
  customerHtml?: string;
  vendorHtml?: string;
};

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendOrderEmails(opts: SendOpts) {
  const resend = client();
  if (!resend) {
    console.info("[order-email] RESEND_API_KEY not set; skip send");
    return;
  }
  const from = process.env.RESEND_FROM || "PotteryMania <onboarding@resend.dev>";
  if (opts.customerEmail && opts.customerHtml) {
    await resend.emails.send({ from, to: opts.customerEmail, subject: opts.subject, html: opts.customerHtml });
  }
  if (opts.vendorEmail && opts.vendorHtml) {
    await resend.emails.send({
      from,
      to: opts.vendorEmail,
      subject: `[Studio] ${opts.subject}`,
      html: opts.vendorHtml,
    });
  }
}

export function orderConfirmationCopy(input: {
  customerName: string;
  studioName: string;
  items: string[];
  totalEur: string;
  shippingMethod?: string | null;
  trackingNumber?: string | null;
}) {
  const list = `<ul>${input.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  const shipping = input.shippingMethod ? `<p>Shipping: ${escapeHtml(input.shippingMethod)}</p>` : "";
  const tracking = input.trackingNumber ? `<p>Tracking: ${escapeHtml(input.trackingNumber)}</p>` : "";
  return {
    customer: `<h1>Order confirmed</h1><p>Hi ${escapeHtml(input.customerName)},</p><p>Your PotteryMania order from ${escapeHtml(input.studioName)} is confirmed.</p>${list}<p>Total: €${escapeHtml(input.totalEur)}</p>${shipping}${tracking}`,
    vendor: `<h1>New order</h1><p>A new order has been placed for ${escapeHtml(input.studioName)}.</p>${list}<p>Total charged: €${escapeHtml(input.totalEur)}</p>`,
  };
}

export function abandonedCartCopy(input: { recoveryUrl: string; itemCount: number }) {
  return `
    <h1>Your cart is waiting</h1>
    <p>You still have ${input.itemCount} item(s) saved in PotteryMania.</p>
    <p><a href="${escapeHtml(input.recoveryUrl)}">Return to your cart</a></p>
  `;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
