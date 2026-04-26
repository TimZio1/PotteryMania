import { escapeHtml, renderEmailShell } from "@/lib/email/base";

export function adminInboxFromAddress() {
  return (
    process.env.ADMIN_INBOX_FROM?.trim() ||
    process.env.SUPPORT_FROM?.trim() ||
    "PotteryMania Support <support@potterymania.com>"
  );
}

export function defaultAdminInboxToAddress() {
  return process.env.ADMIN_INBOX_TO?.trim() || "support@potterymania.com";
}

export function normalizeEmailAddress(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  const angleMatch = trimmed.match(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>/);
  const raw = angleMatch?.[1] || trimmed;
  return raw.trim().toLowerCase();
}

export function normalizeEmailName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const angleIndex = trimmed.indexOf("<");
  if (angleIndex > 0) {
    const name = trimmed.slice(0, angleIndex).replace(/^"|"$/g, "").trim();
    return name || null;
  }
  return null;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function inferMailbox(toEmail: string, subject: string): string {
  const target = `${toEmail} ${subject}`.toLowerCase();
  if (target.includes("affiliate") || target.includes("partner")) return "affiliates";
  if (target.includes("legal") || target.includes("privacy") || target.includes("gdpr")) return "legal";
  if (target.includes("order") || target.includes("return") || target.includes("refund")) return "support";
  return "support";
}

export function buildThreadKey(input: { fromEmail: string; toEmail: string; subject: string }) {
  const normalizedSubject = input.subject
    .toLowerCase()
    .replace(/^(re|fw|fwd):\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  const participants = [input.fromEmail.toLowerCase(), input.toEmail.toLowerCase()].sort().join("|");
  return `${participants}|${normalizedSubject || "(no subject)"}`;
}

export function renderAdminInboxReplyEmail(input: { body: string; originalSubject?: string | null }) {
  const body = escapeHtml(input.body).replace(/\n/g, "<br/>");
  const context = input.originalSubject
    ? `<p style="margin:18px 0 0;font-size:13px;color:#8b7a6d;">Re: ${escapeHtml(input.originalSubject)}</p>`
    : "";
  return renderEmailShell({
    eyebrow: "PotteryMania support",
    title: "Reply from PotteryMania",
    intro: "Thanks for writing to us. Here's our reply.",
    bodyHtml: `<p style="margin:0;">${body}</p>${context}`,
    footerNote:
      "PotteryMania support · support@potterymania.com · This message was sent by an admin from the PotteryMania inbox.",
  });
}
