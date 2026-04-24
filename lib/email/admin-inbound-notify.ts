import { renderEmailShell, sendEmailMessages, escapeHtml } from "./base";
import { getAdminNotifyRecipient } from "./admin-notify-recipient";
import { resolveBackofficeSiteUrl } from "@/lib/public-site-url";

function adminPanelUrl() {
  return `${resolveBackofficeSiteUrl()}/admin`;
}

function safeSend(subject: string, html: string, context: string) {
  const to = getAdminNotifyRecipient();
  if (!to) return;

  void (async () => {
    try {
      await sendEmailMessages([{ to, subject, html }]);
    } catch (e) {
      console.error(`[admin-inbound-notify] ${context}`, e);
    }
  })();
}

export function notifyAdminCatalogLead(input: {
  platformLabel: string;
  email: string;
  studioName: string;
  country: string;
  offeringIntent: string;
  earlyAccessId: string;
  googleMapsUrl?: string;
}) {
  const mapsBlock =
    input.googleMapsUrl && input.googleMapsUrl.trim()
      ? `<p style="margin:0 0 10px;"><strong>Google Maps:</strong> ${escapeHtml(input.googleMapsUrl.trim())}</p>`
      : "";

  const html = renderEmailShell({
    eyebrow: input.platformLabel,
    title: "New catalog registration",
    intro: `${input.studioName} submitted the guided form.`,
    bodyHtml: `
      <p style="margin:0 0 10px;"><strong>Platform:</strong> ${escapeHtml(input.platformLabel)}</p>
      <p style="margin:0 0 10px;"><strong>Studio:</strong> ${escapeHtml(input.studioName)}</p>
      <p style="margin:0 0 10px;"><strong>Email:</strong> ${escapeHtml(input.email)}</p>
      <p style="margin:0 0 10px;"><strong>Country / location note:</strong> ${escapeHtml(input.country)}</p>
      ${mapsBlock}
      <p style="margin:0 0 10px;"><strong>Offering intent:</strong> ${escapeHtml(input.offeringIntent)}</p>
      <p style="margin:0 0 10px;"><strong>Early access id:</strong> ${escapeHtml(input.earlyAccessId)}</p>
    `,
    ctaLabel: "Open admin",
    ctaUrl: adminPanelUrl(),
    footerNote: "Clayense / PotteryMania — inbound catalog lead.",
  });

  safeSend(`New catalog lead: ${input.studioName} (${input.platformLabel})`, html, "catalog lead");
}

export function notifyAdminNewUserAccount(input: {
  platformLabel: string;
  email: string;
  method: "password" | "google";
  userId?: string;
}) {
  const html = renderEmailShell({
    eyebrow: input.platformLabel,
    title: "New account registration",
    intro: `Someone created an account (${input.method}).`,
    bodyHtml: `
      <p style="margin:0 0 10px;"><strong>Platform:</strong> ${escapeHtml(input.platformLabel)}</p>
      <p style="margin:0 0 10px;"><strong>Email:</strong> ${escapeHtml(input.email)}</p>
      <p style="margin:0 0 10px;"><strong>Method:</strong> ${escapeHtml(input.method)}</p>
      ${
        input.userId
          ? `<p style="margin:0 0 10px;"><strong>User id:</strong> ${escapeHtml(input.userId)}</p>`
          : ""
      }
    `,
    ctaLabel: "Open admin",
    ctaUrl: adminPanelUrl(),
    footerNote: "Clayense / PotteryMania — new user account.",
  });

  safeSend(`New account: ${input.email} (${input.platformLabel})`, html, "new account");
}
