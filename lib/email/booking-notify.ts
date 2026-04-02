import { Resend } from "resend";

export async function sendBookingEmails(opts: {
  customerEmail: string;
  studioEmail: string;
  subject: string;
  customerHtml: string;
  studioHtml: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info("[booking-email] RESEND_API_KEY not set; skip send");
    return;
  }
  const resend = new Resend(key);
  const from = process.env.RESEND_FROM || "PotteryMania <onboarding@resend.dev>";
  await resend.emails.send({ from, to: opts.customerEmail, subject: opts.subject, html: opts.customerHtml });
  await resend.emails.send({
    from,
    to: opts.studioEmail,
    subject: `[Studio] ${opts.subject}`,
    html: opts.studioHtml,
  });
}

export function bookingConfirmationCopy(p: {
  experienceTitle: string;
  studioName: string;
  slotDate: string;
  startTime: string;
  participants: number;
  totalEur: string;
}): { customer: string; studio: string } {
  const block = `
    <p>Experience: <strong>${escapeHtml(p.experienceTitle)}</strong></p>
    <p>Studio: ${escapeHtml(p.studioName)}</p>
    <p>When: ${escapeHtml(p.slotDate)} at ${escapeHtml(p.startTime)}</p>
    <p>Participants: ${p.participants}</p>
    <p>Total: €${escapeHtml(p.totalEur)}</p>
  `;
  return {
    customer: `<h1>Booking confirmed</h1>${block}`,
    studio: `<h1>New booking</h1>${block}`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}