import { Resend } from "resend";

export async function sendBookingEmails(opts: {
  customerEmail: string;
  studioEmail?: string | null;
  subject: string;
  customerHtml: string;
  studioHtml?: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info("[booking-email] RESEND_API_KEY not set; skip send");
    return;
  }
  const resend = new Resend(key);
  const from = process.env.RESEND_FROM || "PotteryMania <onboarding@resend.dev>";
  await resend.emails.send({ from, to: opts.customerEmail, subject: opts.subject, html: opts.customerHtml });
  if (opts.studioEmail && opts.studioHtml) {
    await resend.emails.send({
      from,
      to: opts.studioEmail,
      subject: `[Studio] ${opts.subject}`,
      html: opts.studioHtml,
    });
  }
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
    ? `<p>Ticket / reference: <strong>${escapeHtml(p.ticketRef)}</strong></p>`
    : "";
  const seat = p.seatType ? `<p>Seat type: ${escapeHtml(p.seatType)}</p>` : "";
  const block = `
    <p>Experience: <strong>${escapeHtml(p.experienceTitle)}</strong></p>
    <p>Studio: ${escapeHtml(p.studioName)}</p>
    <p>When: ${escapeHtml(p.slotDate)} at ${escapeHtml(p.startTime)}</p>
    <p>Participants: ${p.participants}</p>
    ${seat}
    ${moneyLines(p)}
    ${ticket}
  `;
  return {
    customer: `<h1>Booking confirmed</h1>${block}`,
    studio: `<h1>New confirmed booking</h1>${block}`,
  };
}

export function bookingPendingApprovalCopy(p: BookingEmailFields): { customer: string; studio: string } {
  const ticket = p.ticketRef
    ? `<p>Your reference: <strong>${escapeHtml(p.ticketRef)}</strong> (save this email)</p>`
    : "";
  const seat = p.seatType ? `<p>Seat type: ${escapeHtml(p.seatType)}</p>` : "";
  const block = `
    <p>Experience: <strong>${escapeHtml(p.experienceTitle)}</strong></p>
    <p>Studio: ${escapeHtml(p.studioName)}</p>
    <p>When: ${escapeHtml(p.slotDate)} at ${escapeHtml(p.startTime)}</p>
    <p>Participants: ${p.participants}</p>
    ${seat}
    ${moneyLines(p)}
    ${ticket}
    <p>Your payment was received. The studio will confirm or decline this booking shortly.</p>
  `;
  return {
    customer: `<h1>Booking received — pending studio approval</h1>${block}`,
    studio: `<h1>New booking — approval required</h1>${block}<p>Please approve or decline in your PotteryMania dashboard.</p>`,
  };
}

export function bookingRejectedCopy(p: BookingEmailFields & { reason?: string | null }): string {
  const ticket = p.ticketRef
    ? `<p>Reference: <strong>${escapeHtml(p.ticketRef)}</strong></p>`
    : "";
  const reason = p.reason ? `<p>Note from studio: ${escapeHtml(p.reason)}</p>` : "";
  return `
    <h1>Booking not approved</h1>
    <p>Your booking for <strong>${escapeHtml(p.experienceTitle)}</strong> at ${escapeHtml(p.studioName)} was not approved.</p>
    ${ticket}
    ${reason}
    <p>If you were charged, contact the studio for a refund.</p>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
