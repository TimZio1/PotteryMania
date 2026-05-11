import { Resend } from "resend";
import { BRAND_LOGO_PUBLIC_PATH } from "@/lib/brand";
import { EmailTransportError } from "@/lib/email/email-transport-error";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  /** Resend expects Base64 file contents */
  attachments?: { filename: string; content: string }[];
};

type EmailShellInput = {
  eyebrow?: string;
  title: string;
  intro?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function resendErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;
  }
  return JSON.stringify(error);
}

export async function sendEmailMessages(messages: EmailMessage[]) {
  if (messages.length === 0) return;
  const resend = client();
  if (!resend) {
    throw new EmailTransportError(
      "EMAIL_TRANSPORT_NOT_CONFIGURED",
      "RESEND_API_KEY is not set; cannot send email.",
    );
  }
  const from = process.env.RESEND_FROM || "PotteryMania <orders@potterymania.com>";
  for (const message of messages) {
    try {
      const result = await resend.emails.send({
        from: message.from || from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
        ...(message.attachments?.length
          ? {
              attachments: message.attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
              })),
            }
          : {}),
      });
      if (result.error) {
        throw new EmailTransportError("EMAIL_SEND_FAILED", resendErrorMessage(result.error));
      }
    } catch (e) {
      if (e instanceof EmailTransportError) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      throw new EmailTransportError("EMAIL_SEND_FAILED", msg);
    }
  }
}

function publicSiteOrigin() {
  return resolvePublicSiteUrl();
}

function brandLogoAbsoluteUrl() {
  return `${publicSiteOrigin()}${BRAND_LOGO_PUBLIC_PATH}`;
}

export function renderEmailShell(input: EmailShellInput) {
  const siteUrl = publicSiteOrigin();
  const logoUrl = escapeHtml(brandLogoAbsoluteUrl());
  const cta =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin:32px 0 0"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#2c1810;color:#fff8f3;text-decoration:none;font-weight:600;">${escapeHtml(input.ctaLabel)}</a></p>`
      : "";
  const eyebrow = input.eyebrow
    ? `<p style="margin:0 0 14px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#8b6f5e;">${escapeHtml(input.eyebrow)}</p>`
    : "";
  const footer = escapeHtml(
    input.footerNote ||
      "You're receiving this email about your PotteryMania order. Questions? Email support@potterymania.com — we usually reply within one business day.",
  );

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f1ea;color:#2c1810;font-family:Inter,Arial,sans-serif;">
    <div style="padding:32px 16px;">
      <div style="max-width:640px;margin:0 auto;background:#fffdf9;border:1px solid rgba(79,52,37,0.12);border-radius:28px;overflow:hidden;box-shadow:0 12px 40px rgba(61,36,23,0.08);">
        <div style="padding:22px 28px;background:linear-gradient(135deg,#f3e7da,#e3cfbc);border-bottom:1px solid rgba(79,52,37,0.12);">
          <img src="${logoUrl}" alt="" width="200" role="presentation" style="max-width:200px;height:auto;display:block;border:0;" />
        </div>
        <div style="padding:36px 28px;">
          ${eyebrow}
          <h1 style="margin:0 0 16px;font-size:32px;line-height:1.1;font-family:Georgia,serif;font-weight:400;color:#2c1810;">${escapeHtml(input.title)}</h1>
          ${input.intro ? `<p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#5f5045;">${escapeHtml(input.intro)}</p>` : ""}
          <div style="font-size:15px;line-height:1.8;color:#3a3029;">${input.bodyHtml}</div>
          ${cta}
        </div>
        <div style="padding:18px 28px;border-top:1px solid rgba(79,52,37,0.12);background:#fbf7f2;">
          <p style="margin:0;font-size:12px;line-height:1.7;color:#8b7a6d;">${footer}</p>
          <p style="margin:6px 0 0;font-size:12px;line-height:1.7;color:#8b7a6d;"><a href="${siteUrl}" style="color:#7a553f;text-decoration:none;">${siteUrl}</a></p>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export function renderBulletList(items: string[]) {
  return `<ul style="margin:16px 0;padding-left:20px;">${items
    .map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
