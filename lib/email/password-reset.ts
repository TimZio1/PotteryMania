import { renderEmailShell, sendEmailMessages, escapeHtml } from "./base";

function resetUrl(origin: string, rawToken: string) {
  const u = new URL("/reset-password", origin);
  u.searchParams.set("token", rawToken);
  return u.toString();
}

export async function sendPasswordResetEmail(opts: { to: string; resetToken: string }) {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    process.env.AUTH_URL?.replace(/\/+$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000";
  const url = resetUrl(origin, opts.resetToken);
  const html = renderEmailShell({
    eyebrow: "Account security",
    title: "Reset your password",
    intro: "We received a request to reset the password for your PotteryMania account.",
    bodyHtml: `<p>If you made this request, use the button below. The link expires in one hour.</p><p style="margin-top:18px;font-size:14px;color:#5f5045;">If you didn&apos;t ask for this, you can ignore this email — your password will stay the same.</p><p style="margin-top:18px;font-size:13px;color:#8b7a6d;word-break:break-all;">Link (if the button doesn&apos;t work):<br/>${escapeHtml(url)}</p>`,
    ctaLabel: "Choose a new password",
    ctaUrl: url,
    footerNote: "Never share this link. PotteryMania staff will never ask for it.",
  });
  await sendEmailMessages([{ to: opts.to, subject: "Reset your PotteryMania password", html }]);
}
