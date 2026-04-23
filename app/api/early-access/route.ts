import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EMAIL = 200;
const MAX_STUDIO = 160;
const MAX_COUNTRY = 100;
const MAX_CITY = 100;
const MAX_WEBSITE = 300;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function looksLikeGoogleMapsUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    const host = url.hostname.toLowerCase();
    if (host === "maps.app.goo.gl") return true;
    if (host === "goo.gl") return url.pathname.toLowerCase().startsWith("/maps");
    return host.includes("google.") && (host.startsWith("maps.") || url.pathname.toLowerCase().includes("/maps"));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const raw = (payload ?? {}) as Record<string, unknown>;
  const email = asString(raw.email).toLowerCase();
  const studioName = asString(raw.studioName);
  const country = asString(raw.country);
  const city = asString(raw.city);
  const googleMapsUrl = asString(raw.googleMapsUrl);
  const websiteOrIg = asString(raw.websiteOrIg);
  const offeringIntent = asString(raw.offeringIntent);
  const honeypot = asString(raw.website);

  if (honeypot) {
    return NextResponse.json({ ok: true, bot: true });
  }

  if (!email || email.length > MAX_EMAIL || !looksLikeEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (!studioName || studioName.length > MAX_STUDIO) {
    return NextResponse.json({ error: "Please enter a valid studio name." }, { status: 400 });
  }
  if (!country || country.length > MAX_COUNTRY) {
    return NextResponse.json({ error: "Please enter a valid country." }, { status: 400 });
  }
  if (city.length > MAX_CITY) {
    return NextResponse.json({ error: "City is too long." }, { status: 400 });
  }
  if (websiteOrIg.length > MAX_WEBSITE) {
    return NextResponse.json({ error: "Website/Instagram is too long." }, { status: 400 });
  }
  if (googleMapsUrl.length > MAX_WEBSITE || !looksLikeGoogleMapsUrl(googleMapsUrl)) {
    return NextResponse.json({ error: "Please paste a valid Google Maps link." }, { status: 400 });
  }

  const intent = offeringIntent === "shop" || offeringIntent === "classes" || offeringIntent === "both" ? offeringIntent : "both";
  const profileSummary = [
    city ? `city:${city}` : "",
    googleMapsUrl ? `maps:${googleMapsUrl}` : "",
    websiteOrIg ? `web:${websiteOrIg}` : "",
  ]
    .filter(Boolean)
    .join(" | ")
    .slice(0, MAX_WEBSITE);

  const record = await prisma.earlyAccessSignup.upsert({
    where: { email },
    update: {
      studioName,
      country,
      websiteOrIg: profileSummary || null,
      wantBooking: intent === "classes" || intent === "both",
      wantMarket: intent === "shop" || intent === "both",
      wantBoth: intent === "both",
    },
    create: {
      email,
      studioName,
      country,
      websiteOrIg: profileSummary || null,
      wantBooking: intent === "classes" || intent === "both",
      wantMarket: intent === "shop" || intent === "both",
      wantBoth: intent === "both",
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: record.id });
}
