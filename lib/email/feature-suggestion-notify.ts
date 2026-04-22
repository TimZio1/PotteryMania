import { escapeHtml, renderEmailShell, sendEmailMessages } from "./base";
import { resolveBackofficeSiteUrl, resolveFrontdeskSiteUrl } from "@/lib/public-site-url";

export type FeatureSuggestionMailInput = {
  id: string;
  body: string;
  submitterEmail: string | null;
  submitterName: string | null;
  /** User id if the submitter was signed in. */
  userId: string | null;
  createdAt: Date;
};

function customerSiteUrl() {
  return resolveFrontdeskSiteUrl();
}

function backofficeSiteUrl() {
  return resolveBackofficeSiteUrl();
}

/** Where to route new suggestion alerts. Set on hosting, e.g. FEATURE_SUGGESTION_NOTIFY_EMAIL. */
function notifyRecipient(): string | null {
  const a = process.env.FEATURE_SUGGESTION_NOTIFY_EMAIL?.trim();
  if (a) return a;
  const b = process.env.HYPERADMIN_ALERT_EMAIL?.trim();
  if (b) return b;
  const c = process.env.SEED_HYPER_ADMIN_EMAIL?.trim();
  if (c) return c;
  return null;
}

function shortId(id: string) {
  return id.split("-")[0] ?? id.slice(0, 8);
}

/**
 * Sends two emails when someone suggests a feature:
 *  1. A thank-you to the submitter (only if they left an email).
 *  2. An alert to the team with the full idea.
 *
 * Email failures are surfaced by the caller; the DB row is saved first so
 * nothing is ever lost.
 */
export async function sendFeatureSuggestionEmails(input: FeatureSuggestionMailInput) {
  const messages: Parameters<typeof sendEmailMessages>[0] = [];

  const safeBodyLines = input.body
    .split(/\r?\n/)
    .map((line) => escapeHtml(line))
    .join("<br />");

  const who = input.submitterName?.trim() || input.submitterEmail?.trim() || "Anonymous";

  if (input.submitterEmail) {
    const thankYouHtml = renderEmailShell({
      eyebrow: "Thanks for the idea",
      title: "We got your suggestion",
      intro: input.submitterName?.trim()
        ? `Thanks, ${input.submitterName.trim()}.`
        : "Thanks for taking the time.",
      bodyHtml: `
        <p style="margin:0 0 12px;">Here’s what you sent us:</p>
        <blockquote style="margin:0;padding:14px 18px;border-left:3px solid #c9a27a;background:#fbf3ea;color:#3a3029;border-radius:8px;">${safeBodyLines}</blockquote>
        <p style="margin:16px 0 0;">We read every idea. If we build it, we’ll let you know.</p>
      `,
      ctaLabel: "Back to PotteryMania",
      ctaUrl: customerSiteUrl(),
      footerNote: "You’re receiving this because you submitted a feature suggestion on PotteryMania.",
    });

    messages.push({
      to: input.submitterEmail,
      subject: "Thanks — we got your idea",
      html: thankYouHtml,
    });
  }

  const notifyTo = notifyRecipient();
  if (notifyTo) {
    const contactLine = input.submitterEmail
      ? `<p style="margin:0 0 10px;"><strong>From:</strong> ${escapeHtml(who)} &lt;${escapeHtml(input.submitterEmail)}&gt;</p>`
      : `<p style="margin:0 0 10px;"><strong>From:</strong> ${escapeHtml(who)} (no email)</p>`;

    const adminHtml = renderEmailShell({
      eyebrow: "New feature suggestion",
      title: `Idea #${shortId(input.id)}`,
      intro: "A new idea just came in from the public form.",
      bodyHtml: `
        ${contactLine}
        ${input.userId ? `<p style="margin:0 0 10px;"><strong>User id:</strong> <code>${escapeHtml(input.userId)}</code></p>` : ""}
        <p style="margin:0 0 10px;"><strong>Submitted:</strong> ${escapeHtml(input.createdAt.toISOString())}</p>
        <p style="margin:16px 0 8px;"><strong>Idea:</strong></p>
        <blockquote style="margin:0;padding:14px 18px;border-left:3px solid #c9a27a;background:#fbf3ea;color:#3a3029;border-radius:8px;">${safeBodyLines}</blockquote>
      `,
      ctaLabel: "Open the ideas inbox",
      ctaUrl: `${backofficeSiteUrl()}/admin/feature-suggestions?status=new`,
      footerNote: "PotteryMania admin notification.",
    });

    messages.push({
      to: notifyTo,
      subject: `[PotteryMania] New idea: ${truncate(input.body, 60)}`,
      html: adminHtml,
    });
  }

  if (messages.length === 0) return;
  await sendEmailMessages(messages);
}

function truncate(s: string, n: number) {
  const trimmed = s.trim().replace(/\s+/g, " ");
  return trimmed.length > n ? `${trimmed.slice(0, n - 1)}…` : trimmed;
}
