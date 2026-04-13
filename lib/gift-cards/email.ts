import { escapeHtml, renderEmailShell, sendEmailMessages } from "@/lib/email/base";

function money(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export function giftCardEmailCopy(input: {
  recipientName?: string | null;
  purchaserName?: string | null;
  studioName: string;
  code: string;
  valueCents: number;
  validUntil?: Date | null;
  personalMessage?: string | null;
  balanceUrl: string;
}) {
  const introName = input.recipientName?.trim() || "there";
  const fromLine = input.purchaserName?.trim()
    ? `<p style="margin:0 0 8px;">From: ${escapeHtml(input.purchaserName.trim())}</p>`
    : "";
  const expiresLine = input.validUntil
    ? `<p style="margin:0 0 8px;">Valid until: ${escapeHtml(input.validUntil.toISOString().slice(0, 10))}</p>`
    : "";
  const messageLine = input.personalMessage?.trim()
    ? `<div style="margin:16px 0 0;padding:14px 16px;border-radius:18px;background:#f7f2ec;"><p style="margin:0;font-style:italic;">"${escapeHtml(input.personalMessage.trim()).replace(/\n/g, "<br />")}"</p></div>`
    : "";

  return renderEmailShell({
    eyebrow: "Gift card",
    title: "You received a gift card",
    intro: `Hi ${introName}, ${input.studioName} sent you a PotteryMania gift card.`,
    bodyHtml: `
      <p style="margin:0 0 8px;">Code: <strong>${escapeHtml(input.code)}</strong></p>
      <p style="margin:0 0 8px;">Value: <strong>${escapeHtml(money(input.valueCents))}</strong></p>
      ${fromLine}
      ${expiresLine}
      ${messageLine}
    `,
    ctaLabel: "Check balance",
    ctaUrl: input.balanceUrl,
    footerNote: "Bring this code to checkout to redeem it against future bookings or purchases.",
  });
}

export async function sendGiftCardEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  await sendEmailMessages([
    {
      to: input.to,
      subject: input.subject,
      html: input.html,
    },
  ]);
}
