import { renderEmailShell, sendEmailMessages, escapeHtml } from "./base";
import { resolveFrontdeskSiteUrl } from "@/lib/public-site-url";

function resetUrl(origin: string, rawToken: string) {
  const u = new URL("/reset-password", origin);
  u.searchParams.set("token", rawToken);
  return u.toString();
}

export async function sendPasswordResetEmail(opts: { to: string; resetToken: string }) {
  const origin = resolveFrontdeskSiteUrl();
  const url = resetUrl(origin, opts.resetToken);
  const html = renderEmailShell({
    eyebrow: "Password reset",
    title: "Reset your password",
    intro: "Someone (probably you) asked to reset your password.",
    bodyHtml: `<p>Tap the button below to set a new one. The link works for one hour.</p><p style="margin-top:18px;font-size:14px;color:#5f5045;">Didn&apos;t ask for this? Ignore this email — your password won&apos;t change.</p><p style="margin-top:18px;font-size:13px;color:#8b7a6d;word-break:break-all;">Button not working? Use this link:<br/>${escapeHtml(url)}</p>`,
    ctaLabel: "Set a new password",
    ctaUrl: url,
    footerNote: "Never share this link. Support will never ask for it.",
  });
  await sendEmailMessages([{ to: opts.to, subject: "Reset your PotteryMania password", html }]);
}
