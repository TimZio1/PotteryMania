import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const studios = await prisma.studio.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ studios });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const opt = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : null);
  const num = (k: string) => (typeof body[k] === "number" ? body[k] as number : null);
  const arr = (k: string) =>
    Array.isArray(body[k]) ? (body[k] as unknown[]).filter((v): v is string => typeof v === "string").map((v) => v.trim().toLowerCase()).filter(Boolean) : [];
  const listingOnly = body.listingOnly === true;
  const quickStart = body.quickStart === true;

  const displayName = str("displayName");
  const supportedLanguages = arr("supportedLanguages");

  let legalBusinessName = str("legalBusinessName") || displayName;
  const fallbackVat = `FREE-LISTING-${user.id.slice(0, 8)}`;
  let vatNumber = str("vatNumber") || (listingOnly ? fallbackVat : "");
  const fallbackResponsible = user.email.split("@")[0] || "Studio owner";
  let responsiblePersonName = str("responsiblePersonName") || (listingOnly ? fallbackResponsible : "");
  let email = str("email");
  let country = str("country");
  let city = str("city");
  let addressLine1 = str("addressLine1");

  if (quickStart) {
    email = str("email") || user.email?.trim() || "";
    country = str("country");
    city = str("city") || "Pending";
    const idCompact = user.id.replace(/-/g, "");
    vatNumber = `QUICKSTART-${idCompact.slice(0, 8)}-${Date.now().toString(36)}`;
    responsiblePersonName = fallbackResponsible;
    legalBusinessName = displayName;
    addressLine1 = "Pending — complete in Studio profile";
    if (!displayName || !country) {
      return NextResponse.json({ error: "Studio name and country are required" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json(
        { error: "Add a contact email or verify your account has an email address." },
        { status: 400 },
      );
    }
  } else if (!displayName || !legalBusinessName || !vatNumber || !responsiblePersonName || !email || !country || !city || !addressLine1) {
    return NextResponse.json({ error: "Missing required studio fields" }, { status: 400 });
  }

  const studio = await prisma.studio.create({
    data: {
      ownerUserId: user.id,
      displayName,
      legalBusinessName,
      vatNumber,
      responsiblePersonName,
      email,
      phone: opt("phone"),
      country,
      city,
      addressLine1,
      addressLine2: opt("addressLine2"),
      postalCode: opt("postalCode"),
      latitude: num("latitude") ?? undefined,
      longitude: num("longitude") ?? undefined,
      shortDescription: opt("shortDescription"),
      longDescription: opt("longDescription"),
      logoUrl: listingOnly || quickStart ? null : opt("logoUrl"),
      coverImageUrl: opt("coverImageUrl"),
      instagramUrl: opt("instagramUrl"),
      facebookUrl: opt("facebookUrl"),
      websiteUrl: opt("websiteUrl"),
      preferredLanguage: opt("preferredLanguage"),
      preferredCurrency: opt("preferredCurrency"),
      supportedLanguages: supportedLanguages.length > 0 ? supportedLanguages : ["en"],
      status: "approved",
      approvedAt: new Date(),
    },
  });

  return NextResponse.json({ studio }, { status: 201 });
}