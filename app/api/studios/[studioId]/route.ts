import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireStudioOwner } from "@/lib/studio-api-auth";
import { parsePublicServiceModes, validatePublicServiceModesInput } from "@/lib/studio-public-service-modes";

type Ctx = { params: Promise<{ studioId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return apiError(auth.error, auth.status);
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) return apiError("Studio not found", 404);
  if (studio.status === "suspended") {
    return apiError("Studio suspended", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : undefined);
  const num = (k: string) => (typeof body[k] === "number" ? (body[k] as number) : undefined);
  const arr = (k: string) =>
    Array.isArray(body[k])
      ? (body[k] as unknown[])
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean)
      : undefined;

  const data: Record<string, unknown> = {};
  const tz = str("ianaTimezone");
  if (tz !== undefined) {
    const SAFE_TZ = /^[A-Za-z_]+\/[A-Za-z0-9_+\-]+$/;
    data.ianaTimezone = tz && SAFE_TZ.test(tz) ? tz : null;
  }
  const keys = [
    "displayName",
    "legalBusinessName",
    "vatNumber",
    "responsiblePersonName",
    "email",
    "phone",
    "country",
    "city",
    "addressLine1",
    "addressLine2",
    "postalCode",
    "shortDescription",
    "longDescription",
    "logoUrl",
    "coverImageUrl",
    "instagramUrl",
    "facebookUrl",
    "websiteUrl",
    "preferredLanguage",
    "preferredCurrency",
    "whatsappNumber",
  ] as const;
  for (const k of keys) {
    const v = str(k);
    if (v !== undefined) data[k] = v || null;
  }

  if (body.openingHours !== undefined) {
    if (body.openingHours === null || body.openingHours === "") {
      data.openingHours = null;
    } else if (Array.isArray(body.openingHours)) {
      data.openingHours = body.openingHours;
    }
  }
  if (body.latitude !== undefined) data.latitude = num("latitude");
  if (body.longitude !== undefined) data.longitude = num("longitude");
  if (body.supportedLanguages !== undefined) data.supportedLanguages = arr("supportedLanguages") ?? ["en"];

  if (body.publicServiceModes !== undefined) {
    const patch = body.publicServiceModes;
    if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
      return apiError("publicServiceModes must be an object", 400);
    }
    const base = parsePublicServiceModes(studio.publicServiceModes);
    const p = patch as Record<string, unknown>;
    const merged = {
      classes:
        p.classes !== undefined && p.classes !== null && typeof p.classes === "object" && !Array.isArray(p.classes)
          ? p.classes
          : base.classes,
      shop:
        p.shop !== undefined && p.shop !== null && typeof p.shop === "object" && !Array.isArray(p.shop)
          ? p.shop
          : base.shop,
      contact:
        p.contact !== undefined && p.contact !== null && typeof p.contact === "object" && !Array.isArray(p.contact)
          ? p.contact
          : base.contact,
    };
    const parsed = validatePublicServiceModesInput(merged);
    if (!parsed.ok) {
      return apiError(parsed.error, 400);
    }
    data.publicServiceModes = parsed.value as object;
  }

  const updated = await prisma.studio.update({
    where: { id: studioId },
    data: data as object,
  });
  return apiSuccess({ studio: updated });
}