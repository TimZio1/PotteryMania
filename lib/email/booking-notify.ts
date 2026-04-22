import { escapeHtml, renderEmailShell, sendEmailMessages } from "./base";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";

const siteUrl = resolvePublicSiteUrl();

export async function sendBookingEmails(opts: {
  customerEmail: string;
  studioEmail?: string | null;
  subject: string;
  customerHtml: string;
  studioHtml?: string;
  /** Base64 ICS etc., customer message only */
  customerAttachments?: { filename: string; content: string }[];
}): Promise<void> {
  const messages = [
    {
      to: opts.customerEmail,
      subject: opts.subject,
      html: opts.customerHtml,
      ...(opts.customerAttachments?.length ? { attachments: opts.customerAttachments } : {}),
    },
  ];
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
  instructorName?: string | null;
  addOnLines?: string[];
  intakeLines?: { label: string; value: string }[];
};

function moneyLines(p: BookingEmailFields): string {
  const hasDeposit =
    p.balanceEur !== undefined &&
    p.paidEur !== undefined &&
    Number.parseFloat(p.balanceEur) > 0;
  if (hasDeposit) {
    return `
    <p>Total: €${escapeHtml(p.totalEur)}</p>
    <p>Paid today: €${escapeHtml(p.paidEur!)}</p>
    <p>Pay on arrival: €${escapeHtml(p.balanceEur!)}</p>
  `;
  }
  return `<p>Total: €${escapeHtml(p.totalEur)}</p>`;
}

function extrasBlock(p: BookingEmailFields): string {
  const addOns = p.addOnLines?.filter(Boolean) ?? [];
  const intake = p.intakeLines?.filter((line) => line.label && line.value) ?? [];
  if (addOns.length === 0 && intake.length === 0) return "";

  const addOnHtml = addOns.length
    ? `<div style="margin:12px 0 0;">
        <p style="margin:0 0 6px;"><strong>Add-ons</strong></p>
        <ul style="margin:0; padding-left:18px;">
          ${addOns.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
        </ul>
      </div>`
    : "";

  const intakeHtml = intake.length
    ? `<div style="margin:12px 0 0;">
        <p style="margin:0 0 6px;"><strong>Your answers</strong></p>
        ${intake
          .map(
            (line) =>
              `<p style="margin:0 0 6px;"><strong>${escapeHtml(line.label)}:</strong> ${escapeHtml(line.value).replace(/\n/g, "<br />")}</p>`,
          )
          .join("")}
      </div>`
    : "";

  return `${addOnHtml}${intakeHtml}`;
}

export function bookingConfirmationCopy(p: BookingEmailFields): { customer: string; studio: string } {
  const ticket = p.ticketRef
    ? `<p style="margin:0 0 8px;">Ticket: <strong>${escapeHtml(p.ticketRef)}</strong></p>`
    : "";
  const seat = p.seatType ? `<p style="margin:0 0 8px;">Seat type: ${escapeHtml(p.seatType)}</p>` : "";
  const instructor = p.instructorName
    ? `<p style="margin:0 0 8px;">Instructor: ${escapeHtml(p.instructorName)}</p>`
    : "";
  const customerBlock = `
    <p style="margin:0 0 8px;">Class: <strong>${escapeHtml(p.experienceTitle)}</strong></p>
    <p style="margin:0 0 8px;">Studio: ${escapeHtml(p.studioName)}</p>
    <p style="margin:0 0 8px;">Date & time: ${escapeHtml(p.slotDate)} at ${escapeHtml(p.startTime)}</p>
    <p style="margin:0 0 8px;">Guests: ${p.participants}</p>
    ${seat}
    ${instructor}
    ${extrasBlock(p)}
    ${moneyLines(p)}
    ${ticket}
  `;
  return {
    customer: renderEmailShell({
      eyebrow: "You're booked",
      title: "Your booking is confirmed",
      intro: `See you at ${p.experienceTitle}.`,
      bodyHtml: customerBlock,
      ctaLabel: "View my bookings",
      ctaUrl: `${siteUrl}/my-bookings`,
    }),
    studio: renderEmailShell({
      eyebrow: "New booking",
      title: "A new booking just came in",
      intro: `${p.experienceTitle} — confirmed.`,
      bodyHtml: customerBlock,
      ctaLabel: "Open dashboard",
      ctaUrl: `${siteUrl}/dashboard`,
    }),
  };
}

export function bookingPendingStudioConfirmationCopy(p: BookingEmailFields): { customer: string; studio: string } {
  const ticket = p.ticketRef
    ? `<p style="margin:0 0 8px;">Ticket: <strong>${escapeHtml(p.ticketRef)}</strong> (save this email)</p>`
    : "";
  const seat = p.seatType ? `<p style="margin:0 0 8px;">Seat type: ${escapeHtml(p.seatType)}</p>` : "";
  const instructor = p.instructorName
    ? `<p style="margin:0 0 8px;">Instructor: ${escapeHtml(p.instructorName)}</p>`
    : "";
  const block = `
    <p style="margin:0 0 8px;">Class: <strong>${escapeHtml(p.experienceTitle)}</strong></p>
    <p style="margin:0 0 8px;">Studio: ${escapeHtml(p.studioName)}</p>
    <p style="margin:0 0 8px;">Date & time: ${escapeHtml(p.slotDate)} at ${escapeHtml(p.startTime)}</p>
    <p style="margin:0 0 8px;">Guests: ${p.participants}</p>
    ${seat}
    ${instructor}
    ${extrasBlock(p)}
    ${moneyLines(p)}
    ${ticket}
    <p style="margin:16px 0 0;">Payment received. The studio will confirm soon.</p>
  `;
  return {
    customer: renderEmailShell({
      eyebrow: "Waiting for studio",
      title: "Your booking is almost confirmed",
      intro: "We've got your payment. The studio will confirm soon.",
      bodyHtml: block,
      ctaLabel: "View my bookings",
      ctaUrl: `${siteUrl}/my-bookings`,
    }),
    studio: renderEmailShell({
      eyebrow: "Action needed",
      title: "A booking is waiting for you",
      intro: `Confirm or decline: ${p.experienceTitle}.`,
      bodyHtml: `${block}<p style="margin:16px 0 0;">Open your dashboard to confirm or decline.</p>`,
      ctaLabel: "Open dashboard",
      ctaUrl: `${siteUrl}/dashboard`,
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
    title: "Your booking couldn't be confirmed",
    intro: `${p.studioName} wasn't able to confirm your booking for ${p.experienceTitle}.`,
    bodyHtml: `${ticket}${reason}<p style="margin:16px 0 0;">If you were charged, contact the studio and they'll refund you.</p>`,
    ctaLabel: "View my bookings",
    ctaUrl: `${siteUrl}/my-bookings`,
  });
}

export function reviewRequestCopy(input: {
  customerName: string;
  experienceTitle: string;
  studioName: string;
  reviewUrl: string;
}): string {
  return renderEmailShell({
    eyebrow: "How was it?",
    title: `Leave a review for ${input.experienceTitle}`,
    intro: `Thanks for coming to ${input.studioName}.`,
    bodyHtml: `<p style="margin:0 0 12px;">Hi ${escapeHtml(input.customerName)},</p><p style="margin:0;">A quick review helps other guests pick the right class, and helps the studio. It only takes a minute.</p>`,
    ctaLabel: "Leave a review",
    ctaUrl: input.reviewUrl,
  });
}

export function bookSoonCopy(input: {
  customerName: string;
  subject: string;
  bodyHtml: string;
  ctaUrl: string;
}): string {
  return renderEmailShell({
    eyebrow: "Ready for another?",
    title: input.subject,
    intro: `Hi ${input.customerName}, want to book your next class?`,
    bodyHtml: input.bodyHtml,
    ctaLabel: "Find a class",
    ctaUrl: input.ctaUrl,
  });
}
