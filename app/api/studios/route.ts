import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  const studios = await prisma.studio.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return apiSuccess({ studios });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
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
    const quickMissing: string[] = [];
    if (!displayName) quickMissing.push("displayName");
    if (!country) quickMissing.push("country");
    if (!email) quickMissing.push("email");
    if (quickMissing.length) {
      const errMsg =
        quickMissing.length === 1 && quickMissing[0] === "email"
          ? "Add a contact email or verify your account has an email address."
          : quickMissing.includes("displayName") && quickMissing.includes("country")
            ? "Studio name and country are required."
            : quickMissing.includes("displayName")
              ? "Studio name is required."
              : quickMissing.includes("country")
                ? "Country is required."
                : "Please complete the required fields.";
      return apiError(errMsg, 400, { missing: quickMissing });
    }
  } else {
    const fullMissing: string[] = [];
    if (!displayName) fullMissing.push("displayName");
    if (!legalBusinessName) fullMissing.push("legalBusinessName");
    if (!vatNumber) fullMissing.push("vatNumber");
    if (!responsiblePersonName) fullMissing.push("responsiblePersonName");
    if (!email) fullMissing.push("email");
    if (!country) fullMissing.push("country");
    if (!city) fullMissing.push("city");
    if (!addressLine1) fullMissing.push("addressLine1");
    if (fullMissing.length) {
      return apiError("Fill in every required field (marked with * on the form).", 400, {
        missing: fullMissing,
      });
    }
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
      status: "pending_review",
      approvedAt: null,
    },
  });

  /** Studio panel layout requires `vendor`; first studio creation must promote from `customer`. */
  if (user.role === "customer") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "vendor" },
    });
  }

  return apiSuccess({ studio }, 201);
}