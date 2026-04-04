import { EUROPEAN_PREREGISTRATION_NOTE } from "@/lib/european-preregistration";
import { escapeHtml, renderBulletList, renderEmailShell, sendEmailMessages } from "./base";

type EarlyAccessMailInput = {
  email: string;
  studioName: string;
  country: string;
  websiteOrIg?: string | null;
  wantBooking: boolean;
  wantMarket: boolean;
  wantBoth: boolean;
};

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000";
}

function adminAlertEmail() {
  return process.env.HYPERADMIN_ALERT_EMAIL || process.env.SEED_HYPER_ADMIN_EMAIL || "admin@potterymania.local";
}

function interests(input: EarlyAccessMailInput) {
  const parts = [
    input.wantBooking ? "Booking system" : null,
    input.wantMarket ? "Marketplace" : null,
    input.wantBoth ? "Both (full platform)" : null,
  ].filter(Boolean) as string[];
  return parts.length ? parts : ["Not specified"];
}

export async function sendEarlyAccessEmails(input: EarlyAccessMailInput) {
  const customerHtml = renderEmailShell({
    eyebrow: "Early access confirmed",
    title: "You are on the PotteryMania list",
    intro: `Thanks for registering ${input.studioName}. We have saved your early-access request.`,
    bodyHtml: `
      <p style="margin:0 0 10px;">We will contact you as onboarding opens for your region.</p>
      <p style="margin:0 0 10px;">Country: <strong>${escapeHtml(input.country)}</strong></p>
      <p style="margin:0 0 10px;">Interest:</p>
      ${renderBulletList(interests(input))}
      <p style="margin:16px 0 0;">${escapeHtml(EUROPEAN_PREREGISTRATION_NOTE)}</p>
    `,
    ctaLabel: "Visit PotteryMania",
    ctaUrl: siteUrl(),
    footerNote: "We will reach out when your studio can move into the next onboarding step.",
  });

  const adminHtml = renderEmailShell({
    eyebrow: "New early access lead",
    title: `${input.studioName} just registered`,
    intro: `A new studio joined the PotteryMania early-access pipeline.`,
    bodyHtml: `
      <p style="margin:0 0 10px;"><strong>Studio:</strong> ${escapeHtml(input.studioName)}</p>
      <p style="margin:0 0 10px;"><strong>Email:</strong> ${escapeHtml(input.email)}</p>
      <p style="margin:0 0 10px;"><strong>Country:</strong> ${escapeHtml(input.country)}</p>
      ${
        input.websiteOrIg
          ? `<p style="margin:0 0 10px;"><strong>Website / Instagram:</strong> ${escapeHtml(input.websiteOrIg)}</p>`
          : ""
      }
      <p style="margin:0 0 10px;"><strong>Interest:</strong></p>
      ${renderBulletList(interests(input))}
    `,
    ctaLabel: "Open admin panel",
    ctaUrl: `${siteUrl()}/admin`,
    footerNote: "PotteryMania hyperadmin notification.",
  });

  await sendEmailMessages([
    {
      to: input.email,
      subject: "You are on the PotteryMania early-access list",
      html: customerHtml,
    },
    {
      to: adminAlertEmail(),
      subject: `New early-access studio: ${input.studioName}`,
      html: adminHtml,
    },
  ]);
}
