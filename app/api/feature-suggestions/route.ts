import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { sendFeatureSuggestionEmails } from "@/lib/email/feature-suggestion-notify";
import { isEmailTransportError } from "@/lib/email/email-transport-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 4000;
const MIN_BODY = 10;
const MAX_EMAIL = 200;
const MAX_NAME = 120;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashIp(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || "";
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const raw = (payload ?? {}) as Record<string, unknown>;
  const body = asString(raw.body).trim();
  const submitterEmailInput = asString(raw.submitterEmail).trim();
  const submitterNameInput = asString(raw.submitterName).trim();
  const honeypot = asString(raw.website).trim();

  if (honeypot.length > 0) {
    return NextResponse.json({ ok: true });
  }

  if (body.length < MIN_BODY) {
    return NextResponse.json({ error: "Please share a bit more detail." }, { status: 400 });
  }
  if (body.length > MAX_BODY) {
    return NextResponse.json({ error: "That’s a bit too long. Please shorten your idea." }, { status: 400 });
  }
  if (submitterEmailInput.length > MAX_EMAIL || (submitterEmailInput && !looksLikeEmail(submitterEmailInput))) {
    return NextResponse.json({ error: "That email doesn’t look right." }, { status: 400 });
  }
  if (submitterNameInput.length > MAX_NAME) {
    return NextResponse.json({ error: "Please use a shorter name." }, { status: 400 });
  }

  const user = await getSessionUser();
  const email = submitterEmailInput || user?.email || null;
  const name = submitterNameInput || null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
  const ipHash = hashIp(req);

  const record = await prisma.featureSuggestion.create({
    data: {
      body,
      submitterEmail: email,
      submitterName: name,
      userId: user?.id ?? null,
      userAgent,
      ipHash,
    },
    select: {
      id: true,
      body: true,
      submitterEmail: true,
      submitterName: true,
      userId: true,
      createdAt: true,
    },
  });

  let emailStatus: "sent" | "skipped" | "failed" = "skipped";
  try {
    await sendFeatureSuggestionEmails({
      id: record.id,
      body: record.body,
      submitterEmail: record.submitterEmail,
      submitterName: record.submitterName,
      userId: record.userId,
      createdAt: record.createdAt,
    });
    emailStatus = "sent";
  } catch (e) {
    emailStatus = "failed";
    if (isEmailTransportError(e)) {
      console.warn("[feature-suggestions] email transport", e.code, e.message);
    } else {
      console.error("[feature-suggestions] email failed", e);
    }
  }

  return NextResponse.json({ ok: true, id: record.id, email: emailStatus });
}
