import { escapeHtml, renderBulletList, renderEmailShell, sendEmailMessages } from "./base";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";

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
  return resolvePublicSiteUrl();
}

/** Where to send new lead alerts. Set on hosting, e.g. HYPERADMIN_ALERT_EMAIL */
function leadNotifyRecipient(): string | null {
  const a = process.env.EARLY_ACCESS_NOTIFY_EMAIL?.trim();
  if (a) return a;
  const b = process.env.HYPERADMIN_ALERT_EMAIL?.trim();
  if (b) return b;
  const c = process.env.SEED_HYPER_ADMIN_EMAIL?.trim();
  if (c) return c;
  return null;
}

function interests(input: EarlyAccessMailInput) {
  const parts = [
    input.wantBooking ? "Bookings" : null,
    input.wantMarket ? "Shop" : null,
    input.wantBoth ? "Shop and bookings" : null,
  ].filter(Boolean) as string[];
  return parts.length ? parts : ["Not specified"];
}

export async function sendEarlyAccessEmails(input: EarlyAccessMailInput) {
  const customerHtml = renderEmailShell({
    eyebrow: "Thanks for reaching out",
    title: "We got your details",
    intro: `Thanks, ${input.studioName}.`,
    bodyHtml: `
      <p style="margin:0 0 10px;">Ready when you are — create your studio in the app and you're set.</p>
      <p style="margin:0 0 10px;">Country: <strong>${escapeHtml(input.country)}</strong></p>
      <p style="margin:0 0 10px;">You're interested in:</p>
      ${renderBulletList(interests(input))}
      <p style="margin:16px 0 0;">Everything in one place: classes, shop, bookings, payouts.</p>
    `,
    ctaLabel: "Create my studio",
    ctaUrl: `${siteUrl()}/create-studio`,
    footerNote: "Start any time from your dashboard.",
  });

  const adminHtml = renderEmailShell({
    eyebrow: "New lead",
    title: `${input.studioName} signed up`,
    intro: `New studio lead from the form.`,
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
    footerNote: "PotteryMania admin notification.",
  });

  const messages = [
    {
      to: input.email,
      subject: "Thanks — we got your details",
      html: customerHtml,
    },
  ];

  const notifyTo = leadNotifyRecipient();
  if (notifyTo) {
    messages.push({
      to: notifyTo,
      subject: `New lead: ${input.studioName}`,
      html: adminHtml,
    });
  }

  await sendEmailMessages(messages);
}
