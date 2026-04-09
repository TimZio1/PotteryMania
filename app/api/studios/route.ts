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

  const displayName = str("displayName");
  const supportedLanguages = arr("supportedLanguages");
  const legalBusinessName = str("legalBusinessName") || displayName;
  const fallbackVat = `FREE-LISTING-${user.id.slice(0, 8)}`;
  const vatNumber = str("vatNumber") || (listingOnly ? fallbackVat : "");
  const fallbackResponsible = user.email.split("@")[0] || "Studio owner";
  const responsiblePersonName = str("responsiblePersonName") || (listingOnly ? fallbackResponsible : "");
  const email = str("email");
  const country = str("country");
  const city = str("city");
  const addressLine1 = str("addressLine1");

  if (!displayName || !legalBusinessName || !vatNumber || !responsiblePersonName || !email || !country || !city || !addressLine1) {
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
      logoUrl: listingOnly ? null : opt("logoUrl"),
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