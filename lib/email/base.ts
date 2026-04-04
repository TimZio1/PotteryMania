import { Resend } from "resend";

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
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

export async function sendEmailMessages(messages: EmailMessage[]) {
  const resend = client();
  if (!resend) {
    console.info("[email] RESEND_API_KEY not set; skip send");
    return;
  }
  const from = process.env.RESEND_FROM || "PotteryMania <onboarding@resend.dev>";
  for (const message of messages) {
    await resend.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
  }
}

export function renderEmailShell(input: EmailShellInput) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000";
  const cta =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin:32px 0 0"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#2c1810;color:#fff8f3;text-decoration:none;font-weight:600;">${escapeHtml(input.ctaLabel)}</a></p>`
      : "";
  const eyebrow = input.eyebrow
    ? `<p style="margin:0 0 14px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#8b6f5e;">${escapeHtml(input.eyebrow)}</p>`
    : "";
  const footer = escapeHtml(input.footerNote || "PotteryMania helps ceramic studios sell, teach, and get discovered.");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f1ea;color:#2c1810;font-family:Inter,Arial,sans-serif;">
    <div style="padding:32px 16px;">
      <div style="max-width:640px;margin:0 auto;background:#fffdf9;border:1px solid rgba(79,52,37,0.12);border-radius:28px;overflow:hidden;box-shadow:0 12px 40px rgba(61,36,23,0.08);">
        <div style="padding:22px 28px;background:linear-gradient(135deg,#f3e7da,#e3cfbc);border-bottom:1px solid rgba(79,52,37,0.12);">
          <div style="font-size:26px;line-height:1.1;color:#2c1810;">
            <span style="font-family:Georgia,serif;">Pottery</span><span style="font-weight:700;">Mania</span>
          </div>
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
