import { renderEmailShell, sendEmailMessages, escapeHtml } from "./base";
import { resolveFrontdeskSiteUrl } from "@/lib/public-site-url";

function verifyApiUrl(origin: string, rawToken: string) {
  const u = new URL("/api/auth/verify-email", origin);
  u.searchParams.set("token", rawToken);
  return u.toString();
}

export async function sendEmailVerificationEmail(opts: { to: string; token: string }) {
  const origin = resolveFrontdeskSiteUrl();
  const url = verifyApiUrl(origin, opts.token);
  const html = renderEmailShell({
    eyebrow: "One step left",
    title: "Confirm your email",
    intro: "Welcome. Tap the button to confirm this is your email — that way we can send you receipts and booking updates.",
    bodyHtml: `<p>This link works for 48 hours.</p><p style="margin-top:18px;font-size:14px;color:#5f5045;">Didn&apos;t sign up? Ignore this email.</p><p style="margin-top:18px;font-size:13px;color:#8b7a6d;word-break:break-all;">Button not working? Use this link:<br/>${escapeHtml(url)}</p>`,
    ctaLabel: "Confirm email",
    ctaUrl: url,
    footerNote: "Never share this link. Support will never ask for it.",
  });
  await sendEmailMessages([
    { to: opts.to, subject: "Confirm your email to finish signing up", html },
  ]);
}
