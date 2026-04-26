import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildThreadKey, normalizeEmailAddress } from "@/lib/admin-inbox";
import { escapeHtml } from "@/lib/email/base";

export const dynamic = "force-dynamic";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  let body: {
    name?: unknown;
    email?: unknown;
    audience?: unknown;
    channels?: unknown;
    message?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = clean(body.name, 120);
  const email = normalizeEmailAddress(clean(body.email, 254));
  const audience = clean(body.audience, 240);
  const channels = clean(body.channels, 240);
  const message = clean(body.message, 2000);

  if (name.length < 2) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!isEmail(email)) return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  if (channels.length < 2) return NextResponse.json({ error: "Tell us where you will share." }, { status: 400 });

  const subject = `Affiliate application — ${name}`;
  const textBody = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Audience: ${audience || "Not provided"}`,
    `Channels: ${channels}`,
    "",
    message || "No extra message.",
  ].join("\n");
  const htmlBody = `<p><strong>New PotteryMania affiliate application</strong></p><pre style="white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escapeHtml(
    textBody,
  )}</pre>`;

  const row = await prisma.adminInboxMessage.create({
    data: {
      direction: "inbound",
      mailbox: "affiliates",
      fromEmail: email,
      fromName: name,
      toEmail: "affiliates@potterymania.com",
      subject,
      textBody,
      htmlBody,
      threadKey: buildThreadKey({ fromEmail: email, toEmail: "affiliates@potterymania.com", subject }),
    },
    select: { id: true },
  });

  await prisma.adminNotification.create({
    data: {
      title: "New affiliate application",
      body: `${name} applied to promote PotteryMania apparel.`,
      level: "info",
    },
  });

  return NextResponse.json({ ok: true, id: row.id });
}
