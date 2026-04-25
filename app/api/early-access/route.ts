import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyAdminCatalogLead } from "@/lib/email/admin-inbound-notify";
import { registrationPlatformLabelFromRequest } from "@/lib/registration-platform";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EMAIL = 200;
const MAX_STUDIO = 160;
const MAX_COUNTRY = 100;
const MAX_CITY = 100;
const MAX_WEBSITE = 300;
const MAX_PHOTOS = 8;
const MAX_TEAM_SIZE = 1000;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asOptionalInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number.parseInt(trimmed, 10);
    if (Number.isInteger(n)) return n;
  }
  return null;
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function looksLikeHttpUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
  let country = asString(raw.country);
  if (!country) country = "Not specified";
  const city = asString(raw.city);
  const googleMapsUrl = asString(raw.googleMapsUrl);
  const logoUrl = asString(raw.logoUrl);
  const photoUrls = asStringArray(raw.photoUrls);
  const teamSize = asOptionalInt(raw.teamSize);
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
  if (country.length > MAX_COUNTRY) {
    return NextResponse.json({ error: "Country is too long." }, { status: 400 });
  }
  if (city.length > MAX_CITY) {
    return NextResponse.json({ error: "City is too long." }, { status: 400 });
  }
  if (websiteOrIg.length > MAX_WEBSITE) {
    return NextResponse.json({ error: "Website/Instagram is too long." }, { status: 400 });
  }
  if (googleMapsUrl) {
    if (googleMapsUrl.length > MAX_WEBSITE || !looksLikeGoogleMapsUrl(googleMapsUrl)) {
      return NextResponse.json({ error: "Please paste a valid Google Maps link, or leave it empty." }, { status: 400 });
    }
  }
  if (logoUrl.length > MAX_WEBSITE || !looksLikeHttpUrl(logoUrl)) {
    return NextResponse.json({ error: "Please paste a valid logo URL." }, { status: 400 });
  }
  if (photoUrls.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `Please add up to ${MAX_PHOTOS} photo links.` }, { status: 400 });
  }
  if (photoUrls.some((url) => url.length > MAX_WEBSITE || !looksLikeHttpUrl(url))) {
    return NextResponse.json({ error: "Please paste valid studio photo links." }, { status: 400 });
  }
  if (teamSize != null && (teamSize < 0 || teamSize > MAX_TEAM_SIZE)) {
    return NextResponse.json({ error: "Please enter a valid studio team size." }, { status: 400 });
  }

  const intent = offeringIntent === "shop" || offeringIntent === "classes" || offeringIntent === "both" ? offeringIntent : "both";
  const mergedPhotoUrls = Array.from(new Set([logoUrl, ...photoUrls].filter(Boolean))).slice(0, MAX_PHOTOS);
  const profileSummary = [
    city ? `city:${city}` : "",
    googleMapsUrl ? `maps:${googleMapsUrl}` : "",
    websiteOrIg ? `web:${websiteOrIg}` : "",
    teamSize != null ? `team:${teamSize}` : "",
    logoUrl ? `logo:${logoUrl}` : "",
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
      photoUrls: mergedPhotoUrls,
      wantBooking: intent === "classes" || intent === "both",
      wantMarket: intent === "shop" || intent === "both",
      wantBoth: intent === "both",
    },
    create: {
      email,
      studioName,
      country,
      websiteOrIg: profileSummary || null,
      photoUrls: mergedPhotoUrls,
      wantBooking: intent === "classes" || intent === "both",
      wantMarket: intent === "shop" || intent === "both",
      wantBoth: intent === "both",
    },
    select: { id: true },
  });

  notifyAdminCatalogLead({
    platformLabel: registrationPlatformLabelFromRequest(req),
    email,
    studioName,
    country,
    offeringIntent: intent,
    earlyAccessId: record.id,
    googleMapsUrl: googleMapsUrl || undefined,
  });

  return NextResponse.json({ ok: true, id: record.id });
}
