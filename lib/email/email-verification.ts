import { renderEmailShell, sendEmailMessages, escapeHtml } from "./base";

function verifyApiUrl(origin: string, rawToken: string) {
  const u = new URL("/api/auth/verify-email", origin);
  u.searchParams.set("token", rawToken);
  return u.toString();
}

export async function sendEmailVerificationEmail(opts: { to: string; token: string }) {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    process.env.AUTH_URL?.replace(/\/+$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000";
  const url = verifyApiUrl(origin, opts.token);
  const html = renderEmailShell({
    eyebrow: "Confirm your email",
    title: "Verify your PotteryMania account",
    intro: "Thanks for signing up. Confirm that this address is yours so we can reach you about orders and bookings.",
    bodyHtml: `<p>Tap the button below to verify your email. The link expires in 48 hours.</p><p style="margin-top:18px;font-size:14px;color:#5f5045;">If you didn&apos;t create an account, you can ignore this message.</p><p style="margin-top:18px;font-size:13px;color:#8b7a6d;word-break:break-all;">Link (if the button doesn&apos;t work):<br/>${escapeHtml(url)}</p>`,
    ctaLabel: "Verify email",
    ctaUrl: url,
    footerNote: "Never share this link. PotteryMania staff will never ask for it.",
  });
  await sendEmailMessages([
    { to: opts.to, subject: "Verify your email for PotteryMania", html },
  ]);
}
