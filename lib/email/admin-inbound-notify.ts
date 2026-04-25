import { renderEmailShell, sendEmailMessages, escapeHtml } from "./base";
import { getAdminNotifyRecipient } from "./admin-notify-recipient";
import { resolveBackofficeSiteUrl } from "@/lib/public-site-url";

function adminStudiosUrl() {
  return `${resolveBackofficeSiteUrl()}/admin/studios`;
}

async function sendAdminEmail(subject: string, html: string, context: string) {
  const to = getAdminNotifyRecipient();
  try {
    await sendEmailMessages([{ to, subject, html }]);
  } catch (e) {
    console.error(`[admin-inbound-notify] ${context}`, e);
  }
}

/** When a real `Studio` row is created (vendor finished studio registration in the app). */
export async function notifyAdminNewStudioRegistered(input: {
  studioId: string;
  displayName: string;
  country: string;
  city: string;
  ownerEmail: string;
  ownerUserId: string;
}) {
  const studioUrl = `${adminStudiosUrl()}/${input.studioId}`;
  const html = renderEmailShell({
    eyebrow: "PotteryMania admin",
    title: "New studio registered",
    intro: `${input.displayName} is pending review.`,
    bodyHtml: `
      <p style="margin:0 0 10px;"><strong>Studio:</strong> ${escapeHtml(input.displayName)}</p>
      <p style="margin:0 0 10px;"><strong>Location:</strong> ${escapeHtml(input.city)}, ${escapeHtml(input.country)}</p>
      <p style="margin:0 0 10px;"><strong>Owner email:</strong> ${escapeHtml(input.ownerEmail)}</p>
      <p style="margin:0 0 10px;"><strong>Owner user id:</strong> ${escapeHtml(input.ownerUserId)}</p>
      <p style="margin:0 0 10px;"><strong>Studio id:</strong> ${escapeHtml(input.studioId)}</p>
      <p style="margin:0 0 10px;"><strong>Status:</strong> pending review</p>
    `,
    ctaLabel: "Review in admin",
    ctaUrl: studioUrl,
    footerNote: "PotteryMania — new studio (database record).",
  });

  await sendAdminEmail(`New studio: ${input.displayName}`, html, "new studio");
}
