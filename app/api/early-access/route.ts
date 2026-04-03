import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PHOTOS = 3;
const MAX_URL_LEN = 2048;

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "early-access", 12, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many submissions. Please try again shortly." }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const studioName = typeof body.studioName === "string" ? body.studioName.trim() : "";
  const websiteOrIg = typeof body.websiteOrIg === "string" ? body.websiteOrIg.trim() : "";
  const photoUrls = Array.isArray(body.photoUrls)
    ? body.photoUrls.filter((u): u is string => typeof u === "string" && u.length <= MAX_URL_LEN).slice(0, MAX_PHOTOS)
    : [];
  const wantBooking = body.wantBooking === true;
  const wantMarket = body.wantMarket === true;
  const wantBoth = body.wantBoth === true;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!studioName) {
    return NextResponse.json({ error: "Studio name is required" }, { status: 400 });
  }

  const existing = await prisma.earlyAccessSignup.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "This email is already registered for early access" }, { status: 409 });
  }

  await prisma.earlyAccessSignup.create({
    data: {
      email,
      studioName,
      websiteOrIg: websiteOrIg || null,
      photoUrls,
      wantBooking,
      wantMarket,
      wantBoth,
    },
  });

  return NextResponse.json({ ok: true });
}
