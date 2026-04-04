import { escapeHtml, renderEmailShell, sendEmailMessages } from "./base";

export async function sendBookingEmails(opts: {
  customerEmail: string;
  studioEmail?: string | null;
  subject: string;
  customerHtml: string;
  studioHtml?: string;
}): Promise<void> {
  const messages = [{ to: opts.customerEmail, subject: opts.subject, html: opts.customerHtml }];
  if (opts.studioEmail && opts.studioHtml) {
    messages.push({
      to: opts.studioEmail,
      subject: `[Studio] ${opts.subject}`,
      html: opts.studioHtml,
    });
  }
  await sendEmailMessages(messages);
}

export type BookingEmailFields = {
  experienceTitle: string;
  studioName: string;
  slotDate: string;
  startTime: string;
  participants: number;
  totalEur: string;
  ticketRef?: string;
  paidEur?: string;
  balanceEur?: string;
  seatType?: string | null;
};

function moneyLines(p: BookingEmailFields): string {
  const hasDeposit =
    p.balanceEur !== undefined &&
    p.paidEur !== undefined &&
    Number.parseFloat(p.balanceEur) > 0;
  if (hasDeposit) {
    return `
    <p>Total (experience): €${escapeHtml(p.totalEur)}</p>
    <p>Paid online now: €${escapeHtml(p.paidEur!)}</p>
    <p>Balance due (e.g. at studio): €${escapeHtml(p.balanceEur!)}</p>
  `;
  }
  return `<p>Total: €${escapeHtml(p.totalEur)}</p>`;
}

export function bookingConfirmationCopy(p: BookingEmailFields): { customer: string; studio: string } {
  const ticket = p.ticketRef
    ? `<p style="margin:0 0 8px;">Ticket / reference: <strong>${escapeHtml(p.ticketRef)}</strong></p>`
    : "";
  const seat = p.seatType ? `<p style="margin:0 0 8px;">Seat type: ${escapeHtml(p.seatType)}</p>` : "";
  const block = `
    <p style="margin:0 0 8px;">Experience: <strong>${escapeHtml(p.experienceTitle)}</strong></p>
    <p style="margin:0 0 8px;">Studio: ${escapeHtml(p.studioName)}</p>
    <p style="margin:0 0 8px;">When: ${escapeHtml(p.slotDate)} at ${escapeHtml(p.startTime)}</p>
    <p style="margin:0 0 8px;">Participants: ${p.participants}</p>
    ${seat}
    ${moneyLines(p)}
    ${ticket}
  `;
  return {
    customer: renderEmailShell({
      eyebrow: "Booking confirmed",
      title: "Your booking is confirmed",
      intro: `Your place for ${p.experienceTitle} is now confirmed.`,
      bodyHtml: block,
      ctaLabel: "View PotteryMania",
      ctaUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000",
    }),
    studio: renderEmailShell({
      eyebrow: "New confirmed booking",
      title: "A booking has been confirmed",
      intro: `You have a confirmed booking for ${p.experienceTitle}.`,
      bodyHtml: block,
      ctaLabel: "Open dashboard",
      ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000"}/dashboard`,
    }),
  };
}

export function bookingPendingApprovalCopy(p: BookingEmailFields): { customer: string; studio: string } {
  const ticket = p.ticketRef
    ? `<p style="margin:0 0 8px;">Your reference: <strong>${escapeHtml(p.ticketRef)}</strong> (save this email)</p>`
    : "";
  const seat = p.seatType ? `<p style="margin:0 0 8px;">Seat type: ${escapeHtml(p.seatType)}</p>` : "";
  const block = `
    <p style="margin:0 0 8px;">Experience: <strong>${escapeHtml(p.experienceTitle)}</strong></p>
    <p style="margin:0 0 8px;">Studio: ${escapeHtml(p.studioName)}</p>
    <p style="margin:0 0 8px;">When: ${escapeHtml(p.slotDate)} at ${escapeHtml(p.startTime)}</p>
    <p style="margin:0 0 8px;">Participants: ${p.participants}</p>
    ${seat}
    ${moneyLines(p)}
    ${ticket}
    <p style="margin:16px 0 0;">Your payment was received. The studio will confirm or decline this booking shortly.</p>
  `;
  return {
    customer: renderEmailShell({
      eyebrow: "Booking received",
      title: "Your booking is pending studio approval",
      intro: "Your payment was received and the studio has been notified.",
      bodyHtml: block,
      ctaLabel: "View PotteryMania",
      ctaUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000",
    }),
    studio: renderEmailShell({
      eyebrow: "Approval required",
      title: "A new booking needs your review",
      intro: `Please approve or decline the booking for ${p.experienceTitle}.`,
      bodyHtml: `${block}<p style="margin:16px 0 0;">Please approve or decline in your PotteryMania dashboard.</p>`,
      ctaLabel: "Open dashboard",
      ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000"}/dashboard`,
    }),
  };
}

export function bookingRejectedCopy(p: BookingEmailFields & { reason?: string | null }): string {
  const ticket = p.ticketRef
    ? `<p style="margin:0 0 8px;">Reference: <strong>${escapeHtml(p.ticketRef)}</strong></p>`
    : "";
  const reason = p.reason ? `<p style="margin:0 0 8px;">Note from studio: ${escapeHtml(p.reason)}</p>` : "";
  return renderEmailShell({
    eyebrow: "Booking update",
    title: "Your booking was not approved",
    intro: `Your booking for ${p.experienceTitle} at ${p.studioName} was not approved.`,
    bodyHtml: `${ticket}${reason}<p style="margin:16px 0 0;">If you were charged, contact the studio for a refund.</p>`,
    ctaLabel: "View PotteryMania",
    ctaUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000",
  });
}
