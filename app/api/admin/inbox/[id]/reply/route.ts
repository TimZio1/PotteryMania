import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logApiError } from "@/lib/monitoring";
import {
  adminInboxFromAddress,
  buildThreadKey,
  defaultAdminInboxToAddress,
  isValidEmail,
  normalizeEmailAddress,
  renderAdminInboxReplyEmail,
} from "@/lib/admin-inbox";
import { sendEmailMessages } from "@/lib/email/base";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  let body: { body?: string; saveOnly?: boolean };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_inbox_reply_invalid_json", e, { id }, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const original = await prisma.adminInboxMessage.findUnique({ where: { id } });
  if (!original) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const text = typeof body.body === "string" ? body.body.trim().slice(0, 8000) : "";
  if (!text) return NextResponse.json({ error: "Reply body required" }, { status: 400 });

  const fromEmail = normalizeEmailAddress(defaultAdminInboxToAddress());
  const toEmail =
    original.direction === "inbound"
      ? normalizeEmailAddress(original.fromEmail)
      : normalizeEmailAddress(original.toEmail);
  if (!isValidEmail(toEmail)) return NextResponse.json({ error: "Original sender email is invalid" }, { status: 400 });

  const subject = /^re:/i.test(original.subject) ? original.subject : `Re: ${original.subject}`;
  const html = renderAdminInboxReplyEmail({ body: text, originalSubject: original.subject });
  const threadKey =
    original.threadKey || buildThreadKey({ fromEmail, toEmail, subject: original.subject });

  if (!body.saveOnly) {
    await sendEmailMessages([
      {
        to: toEmail,
        subject,
        html,
        text,
        from: adminInboxFromAddress(),
        replyTo: defaultAdminInboxToAddress(),
      },
    ]);
  }

  const row = await prisma.adminInboxMessage.create({
    data: {
      direction: "outbound",
      mailbox: original.mailbox,
      fromEmail,
      toEmail,
      subject,
      textBody: text,
      htmlBody: html,
      threadKey,
      inReplyToId: original.id,
      sentByUserId: user.id,
      savedAt: body.saveOnly ? new Date() : null,
      sentAt: body.saveOnly ? null : new Date(),
    },
  });

  await prisma.adminInboxMessage.update({
    where: { id: original.id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({
    id: row.id,
    status: body.saveOnly ? "saved" : "sent",
  });
}
